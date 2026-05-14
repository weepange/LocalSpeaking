from django.db import models
from django.conf import settings
from channels_app.models import Channel


class Message(models.Model):
    channel = models.ForeignKey(
        Channel,
        on_delete=models.CASCADE,
        related_name='messages'
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    edited_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f'{self.author.username}: {self.content[:30]}'