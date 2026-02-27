package com.smspaisa.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun EarningToggle(
    isActive: Boolean,
    onToggle: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val pulseAnim = rememberInfiniteTransition(label = "pulse")
    val scale by pulseAnim.animateFloat(
        initialValue = 1f,
        targetValue = if (isActive) 1.08f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    val activeColor = MaterialTheme.colorScheme.secondary
    val inactiveColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(140.dp)
        ) {
            if (isActive) {
                // Outer pulse ring
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .scale(scale)
                        .background(
                            color = activeColor.copy(alpha = 0.15f),
                            shape = CircleShape
                        )
                )
                // Middle ring
                Box(
                    modifier = Modifier
                        .size(115.dp)
                        .scale(scale)
                        .background(
                            color = activeColor.copy(alpha = 0.25f),
                            shape = CircleShape
                        )
                )
            }
            // Main button
            Button(
                onClick = { onToggle(!isActive) },
                modifier = Modifier.size(90.dp),
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isActive) activeColor else inactiveColor
                ),
                elevation = ButtonDefaults.buttonElevation(
                    defaultElevation = if (isActive) 8.dp else 2.dp
                )
            ) {
                Text(
                    text = if (isActive) "STOP" else "START",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 16.sp
                    )
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = if (isActive) "Service is running" else "Tap to start earning",
            style = MaterialTheme.typography.bodySmall,
            color = if (isActive) MaterialTheme.colorScheme.secondary
            else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
    }
}
