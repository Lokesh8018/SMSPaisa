package com.smspaisa.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.smspaisa.app.model.SendingProgress
import com.smspaisa.app.model.SendingStatus

@Composable
fun SendingProgressCard(progress: SendingProgress, onRetry: () -> Unit = {}) {
    if (progress.status == SendingStatus.IDLE) return

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = when (progress.status) {
                        SendingStatus.FETCHING -> "Fetching tasks..."
                        SendingStatus.SENDING -> "Sending SMS..."
                        SendingStatus.WAITING -> "Waiting for tasks..."
                        SendingStatus.REPORTING -> "Reporting results to server..."
                        SendingStatus.ROUND_COMPLETE -> "Round complete!"
                        SendingStatus.ERROR -> "Error occurred"
                        else -> ""
                    },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                if (progress.status == SendingStatus.SENDING) {
                    Text("${progress.sentInRound}/${progress.totalInRound}")
                }
            }

            if (progress.status == SendingStatus.SENDING && progress.totalInRound > 0) {
                Spacer(modifier = Modifier.height(8.dp))
                LinearProgressIndicator(
                    progress = { progress.sentInRound.toFloat() / progress.totalInRound.toFloat() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Sending to ${progress.currentRecipient} — \"${progress.currentMessagePreview}\"",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            if (progress.status == SendingStatus.WAITING) {
                Spacer(modifier = Modifier.height(8.dp))
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "No tasks available. Checking again soon...",
                    style = MaterialTheme.typography.bodySmall
                )
            }

            if (progress.status == SendingStatus.REPORTING) {
                Spacer(modifier = Modifier.height(8.dp))
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Syncing SMS results with server...",
                    style = MaterialTheme.typography.bodySmall
                )
            }

            if (progress.status == SendingStatus.ERROR) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = progress.errorMessage ?: "Unknown error occurred",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.height(8.dp))
                Button(onClick = onRetry) {
                    Text("Retry")
                }
            }
        }
    }
}
