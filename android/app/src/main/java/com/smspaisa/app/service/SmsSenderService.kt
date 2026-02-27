package com.smspaisa.app.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.IBinder
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.smspaisa.app.R
import com.smspaisa.app.data.api.WebSocketManager
import com.smspaisa.app.data.datastore.UserPreferences
import com.smspaisa.app.data.repository.DeviceRepository
import com.smspaisa.app.data.repository.SmsRepository
import com.smspaisa.app.model.SmsStatus
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import java.util.Calendar
import java.util.concurrent.atomic.AtomicInteger
import javax.inject.Inject

@AndroidEntryPoint
class SmsSenderService : Service() {

    @Inject lateinit var webSocketManager: WebSocketManager
    @Inject lateinit var userPreferences: UserPreferences
    @Inject lateinit var smsRepository: SmsRepository
    @Inject lateinit var deviceRepository: DeviceRepository

    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private val sentTodayCount = AtomicInteger(0)

    companion object {
        const val CHANNEL_ID = "sms_sender_channel"
        const val NOTIFICATION_ID = 1001
        const val TAG = "SmsSenderService"
        private const val SMS_DELAY_MIN_MILLIS = 3000L
        private const val SMS_DELAY_MAX_MILLIS = 5000L
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification("SMSPaisa running..."))
        serviceScope.launch { startWorking() }
        serviceScope.launch { startHeartbeat() }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        serviceScope.cancel()
        webSocketManager.disconnect()
        super.onDestroy()
    }

    private suspend fun startWorking() {
        val token = userPreferences.authToken.first()
        if (token.isNullOrEmpty()) {
            stopSelf()
            return
        }

        webSocketManager.connect(token)

        // Listen for tasks from WebSocket
        webSocketManager.newTask.collect { task ->
            task ?: return@collect

            if (!shouldSendSms()) {
                webSocketManager.emitTaskResult(task.taskId, "SKIPPED")
                webSocketManager.clearNewTask()
                return@collect
            }

            val dailyLimit = userPreferences.dailySmsLimit.first()
            if (sentTodayCount.get() >= dailyLimit) {
                updateNotification("Daily limit reached (${sentTodayCount.get()}/$dailyLimit)")
                webSocketManager.emitTaskResult(task.taskId, "SKIPPED")
                webSocketManager.clearNewTask()
                return@collect
            }

            // Rate limiting
            delay((SMS_DELAY_MIN_MILLIS..SMS_DELAY_MAX_MILLIS).random())

            try {
                val smsManager = getSmsManager()
                val pendingIntentSent = PendingIntent.getBroadcast(
                    this@SmsSenderService,
                    task.taskId.hashCode(),
                    Intent(SmsSentReceiver.ACTION_SMS_SENT).apply {
                        putExtra("taskId", task.taskId)
                        `package` = packageName
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                val pendingIntentDelivered = PendingIntent.getBroadcast(
                    this@SmsSenderService,
                    task.taskId.hashCode() + 1,
                    Intent(SmsDeliveryReceiver.ACTION_SMS_DELIVERED).apply {
                        putExtra("taskId", task.taskId)
                        `package` = packageName
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                smsRepository.insertLocalLog(
                    taskId = task.taskId,
                    recipient = task.recipient,
                    message = task.message,
                    status = SmsStatus.PENDING
                )

                val parts = smsManager.divideMessage(task.message)
                if (parts.size == 1) {
                    smsManager.sendTextMessage(
                        task.recipient, null, task.message,
                        pendingIntentSent, pendingIntentDelivered
                    )
                } else {
                    val sentList = ArrayList(parts.map { pendingIntentSent })
                    val deliveredList = ArrayList(parts.map { pendingIntentDelivered })
                    smsManager.sendMultipartTextMessage(
                        task.recipient, null, parts, sentList, deliveredList
                    )
                }

                sentTodayCount.incrementAndGet()
                updateNotification("Sent ${sentTodayCount.get()} SMS today")
                webSocketManager.clearNewTask()

            } catch (e: Exception) {
                Log.e(TAG, "Failed to send SMS", e)
                smsRepository.updateLocalLogStatus(task.taskId, SmsStatus.FAILED)
                smsRepository.reportStatus(task.taskId, "FAILED", e.message)
                webSocketManager.emitTaskResult(task.taskId, "FAILED", e.message)
                webSocketManager.clearNewTask()
            }
        }
    }

    private suspend fun startHeartbeat() {
        while (isActive) {
            delay(30_000)
            try {
                val batteryLevel = getBatteryLevel()
                val isCharging = isCharging()
                val networkType = getNetworkType()
                deviceRepository.heartbeat(batteryLevel, isCharging, networkType)
                webSocketManager.emitHeartbeat(deviceRepository.getDeviceId())
            } catch (e: Exception) {
                Log.e(TAG, "Heartbeat failed", e)
            }
        }
    }

    private fun shouldSendSms(): Boolean {
        if (!isNetworkAvailable()) return false
        val batteryLevel = getBatteryLevel()
        val stopAt = runBlocking { userPreferences.stopBatteryPercent.first() }
        if (batteryLevel <= stopAt && !isCharging()) return false
        if (!isWithinActiveHours()) return false
        return true
    }

    private fun isNetworkAvailable(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun getBatteryLevel(): Int {
        val bm = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }

    private fun isCharging(): Boolean {
        val bm = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return bm.isCharging
    }

    private fun getNetworkType(): String {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return "none"
        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
            else -> "other"
        }
    }

    private fun isWithinActiveHours(): Boolean {
        // Default active hours: 8 AM to 10 PM
        val now = Calendar.getInstance()
        val hour = now.get(Calendar.HOUR_OF_DAY)
        return hour in 8..22
    }

    @Suppress("DEPRECATION")
    private fun getSmsManager(): SmsManager {
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            val preferredSim = runBlocking { userPreferences.preferredSim.first() }
            if (preferredSim > 0) {
                // Get SmsManager for the specific SIM subscription
                val subscriptionManager = getSystemService(android.telephony.SubscriptionManager::class.java)
                val subscriptions = subscriptionManager?.activeSubscriptionInfoList
                val targetIndex = preferredSim - 1  // preferredSim: 1=SIM1, 2=SIM2
                val subId = subscriptions?.getOrNull(targetIndex)?.subscriptionId
                if (subId != null) {
                    applicationContext.getSystemService(SmsManager::class.java)
                        .createForSubscriptionId(subId)
                } else {
                    SmsManager.getDefault()
                }
            } else {
                SmsManager.getDefault()
            }
        } else {
            SmsManager.getDefault()
        }
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "SMS Sender Service",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Background SMS sending service"
            setShowBadge(false)
        }
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(channel)
    }

    private fun buildNotification(content: String): Notification {
        val openAppIntent = PendingIntent.getActivity(
            this, 0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SMSPaisa")
            .setContentText(content)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(openAppIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(content: String) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(NOTIFICATION_ID, buildNotification(content))
    }
}
