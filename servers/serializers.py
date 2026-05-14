from rest_framework import serializers
from .models import Server

class ServerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Server

        fields = [
            'id',
            'name',
            'owner',
            'icon',
            'created_at'
        ]

        read_only_fields = [
            'owner',
            'created_at'
        ]