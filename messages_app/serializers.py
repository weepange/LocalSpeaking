from rest_framework import serializers

from .models import Message


class MessageSerializer(serializers.ModelSerializer):

    author_username = serializers.CharField(
        source='author.username',
        read_only=True
    )

    class Meta:
        model = Message

        fields = [
            'id',
            'author',
            'author_username',
            'channel',
            'content',
            'created_at'
        ]

        read_only_fields = [
            'author'
        ]