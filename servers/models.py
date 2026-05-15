from django.db import models
from django.conf import settings


SERVER_ROLE_PERMISSION_FIELDS = [
    'administrator',
    'create_instant_invite',
    'kick_members',
    'ban_members',
    'manage_channels',
    'manage_roles',
    'manage_webhooks',
    'view_audit_log',
    'view_channel',
    'send_messages',
    'send_tts_messages',
    'manage_messages',
    'embed_links',
    'attach_files',
    'read_message_history',
    'mention_everyone',
    'use_external_emojis',
    'add_reactions',
    'connect',
    'speak',
    'mute_members',
    'deafen_members',
    'move_members',
    'use_voice_activity',
    'priority_speaker',
    'request_to_speak',
    'change_nickname',
    'manage_nicknames',
]


class Server(models.Model):
    name = models.CharField(max_length=255)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_servers'
    )

    icon = models.ImageField(
        upload_to='server_icons/',
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ServerRole(models.Model):
    server = models.ForeignKey(
        Server,
        on_delete=models.CASCADE,
        related_name='roles'
    )

    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#5865f2')
    icon = models.CharField(max_length=32, blank=True, default='')
    position = models.PositiveIntegerField(default=0)
    hoist = models.BooleanField(default=False)
    mentionable = models.BooleanField(default=False)

    is_default = models.BooleanField(default=False)

    administrator = models.BooleanField(default=False)
    create_instant_invite = models.BooleanField(default=False)
    kick_members = models.BooleanField(default=False)
    ban_members = models.BooleanField(default=False)
    manage_channels = models.BooleanField(default=False)
    manage_roles = models.BooleanField(default=False)
    manage_webhooks = models.BooleanField(default=False)
    view_audit_log = models.BooleanField(default=False)
    view_channel = models.BooleanField(default=True)
    send_messages = models.BooleanField(default=True)
    send_tts_messages = models.BooleanField(default=False)
    manage_messages = models.BooleanField(default=False)
    embed_links = models.BooleanField(default=True)
    attach_files = models.BooleanField(default=True)
    read_message_history = models.BooleanField(default=True)
    mention_everyone = models.BooleanField(default=False)
    use_external_emojis = models.BooleanField(default=False)
    add_reactions = models.BooleanField(default=True)
    connect = models.BooleanField(default=True)
    speak = models.BooleanField(default=True)
    mute_members = models.BooleanField(default=False)
    deafen_members = models.BooleanField(default=False)
    move_members = models.BooleanField(default=False)
    use_voice_activity = models.BooleanField(default=True)
    priority_speaker = models.BooleanField(default=False)
    request_to_speak = models.BooleanField(default=False)
    change_nickname = models.BooleanField(default=True)
    manage_nicknames = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['position', 'id']
        unique_together = ('server', 'name')

    def __str__(self):
        return f'{self.server.name} - {self.name}'

    def has_permission(self, permission_name):
        if self.administrator:
            return True

        return bool(getattr(self, permission_name, False))


class ServerMember(models.Model):
    server = models.ForeignKey(
        Server,
        on_delete=models.CASCADE,
        related_name='members'
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    roles = models.ManyToManyField(
        ServerRole,
        blank=True,
        related_name='members'
    )

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'server')
