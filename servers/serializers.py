from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    SERVER_ROLE_PERMISSION_FIELDS,
    Server,
    ServerMember,
    ServerRole,
)

User = get_user_model()


class ServerRoleSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = ServerRole
        fields = [
            'id',
            'server',
            'name',
            'color',
            'icon',
            'position',
            'hoist',
            'mentionable',
            'is_default',
            'created_at',
            'member_count',
            'permissions',
            *SERVER_ROLE_PERMISSION_FIELDS,
        ]
        read_only_fields = ['server', 'created_at', 'member_count', 'permissions']

    def get_member_count(self, obj):
        return obj.members.count()

    def get_permissions(self, obj):
        return {
            field: bool(getattr(obj, field))
            for field in SERVER_ROLE_PERMISSION_FIELDS
        }


class ServerMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    avatar = serializers.ImageField(source='user.avatar', read_only=True)
    role_ids = serializers.PrimaryKeyRelatedField(
        source='roles',
        many=True,
        queryset=ServerRole.objects.all(),
        required=False,
        write_only=True,
    )
    roles = ServerRoleSerializer(many=True, read_only=True)
    user_username = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = ServerMember
        fields = [
            'id',
            'server',
            'user',
            'username',
            'user_username',
            'avatar',
            'roles',
            'role_ids',
            'joined_at',
        ]
        read_only_fields = ['user', 'joined_at']

    def create(self, validated_data):
        roles = validated_data.pop('roles', [])
        username = validated_data.pop('user_username', None)

        if not username:
            raise serializers.ValidationError({
                'user_username': 'Username is required.'
            })

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError({
                'user_username': 'User with this username does not exist.'
            }) from exc

        member, _ = ServerMember.objects.get_or_create(
            user=user,
            server=validated_data['server'],
        )
        if roles:
            member.roles.set(roles)
        return member

    def update(self, instance, validated_data):
        roles = validated_data.pop('roles', None)

        instance = super().update(instance, validated_data)

        if roles is not None:
            instance.roles.set(roles)

        return instance


class ServerSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(
        source='owner.username',
        read_only=True,
    )
    roles = ServerRoleSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    channel_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Server

        fields = [
            'id',
            'name',
            'owner',
            'owner_username',
            'icon',
            'created_at',
            'roles',
            'member_count',
            'channel_count',
            'is_owner',
        ]

        read_only_fields = [
            'owner',
            'created_at',
            'roles',
            'member_count',
            'channel_count',
            'is_owner',
        ]

    def get_member_count(self, obj):
        return obj.members.count()

    def get_channel_count(self, obj):
        return obj.channels.count()

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.owner_id == request.user.id
