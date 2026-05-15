from rest_framework import serializers

from .models import Channel


class ChannelSerializer(serializers.ModelSerializer):
    server_name = serializers.CharField(
        source='server.name',
        read_only=True,
    )

    class Meta:
        model = Channel

        fields = [
            'id',
            'server',
            'server_name',
            'name',
            'channel_type',
            'created_at',
        ]
