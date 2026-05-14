from django.db import models
from servers.models import Server


class Channel(models.Model):
    TEXT = 'text'
    VOICE = 'voice'

    CHANNEL_TYPES = [
        (TEXT, 'Text'),
        (VOICE, 'Voice'),
    ]

    server = models.ForeignKey(
        Server,
        on_delete=models.CASCADE,
        related_name='channels'
    )

    name = models.CharField(max_length=255)

    channel_type = models.CharField(
        max_length=10,
        choices=CHANNEL_TYPES,
        default=TEXT
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.server.name} - {self.name}'