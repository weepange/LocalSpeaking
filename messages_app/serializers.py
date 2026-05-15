from rest_framework import serializers

from users.serializers import UserSerializer

from .models import (
    DirectConversation,
    DirectMessage,
    Message,
)


class DirectMessageSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(
        source='author.username',
        read_only=True
    )

    class Meta:
        model = DirectMessage
        fields = [
            'id',
            'conversation',
            'author',
            'author_username',
            'content',
            'created_at',
            'edited_at',
        ]
        read_only_fields = ['author']


class DirectConversationSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = DirectConversation
        fields = [
            'id',
            'members',
            'last_message',
            'created_at',
            'updated_at',
        ]

    def get_members(self, obj):
        return UserSerializer(obj.members.all(), many=True).data

    def get_last_message(self, obj):
        message = obj.messages.select_related('author').order_by('-created_at').first()
        if not message:
            return None
        return {
            'id': message.id,
            'author': message.author_id,
            'author_username': message.author.username,
            'content': message.content,
            'created_at': message.created_at,
            'edited_at': message.edited_at,
        }


class MessageSerializer(serializers.ModelSerializer):

    author_username = serializers.CharField(
        source='author.username',
        read_only=True
    )
    channel_name = serializers.CharField(
        source='channel.name',
        read_only=True
    )

    class Meta:
        model = Message

        fields = [
            'id',
            'author',
            'author_username',
            'channel',
            'channel_name',
            'content',
            'created_at',
            'edited_at',
        ]

        read_only_fields = [
            'author'
        ]
