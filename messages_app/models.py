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


class DirectConversation(models.Model):
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='DirectConversationMember',
        related_name='direct_conversations',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        member_names = ', '.join(
            self.members.values_list('username', flat=True)[:2]
        )
        return f'DM: {member_names}'


class DirectConversationMember(models.Model):
    conversation = models.ForeignKey(
        DirectConversation,
        on_delete=models.CASCADE,
        related_name='conversation_members',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dm_memberships',
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('conversation', 'user')


class DirectMessage(models.Model):
    conversation = models.ForeignKey(
        DirectConversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )

    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    edited_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f'{self.author.username}: {self.content[:30]}'
