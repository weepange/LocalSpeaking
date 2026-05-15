from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from servers.models import Server

from .models import Channel
from .serializers import ChannelSerializer


def _ensure_owner(user, server):
    if server.owner_id != user.id:
        raise PermissionDenied('Only the server owner can manage channels.')


def _can_manage_channels(user, server):
    if server.owner_id == user.id:
        return True

    member = server.members.filter(user=user).prefetch_related('roles').first()
    if not member:
        return False

    return member.roles.filter(administrator=True).exists() or member.roles.filter(
        manage_channels=True
    ).exists()


class ChannelListCreateView(generics.ListCreateAPIView):
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_server(self):
        server_id = self.request.query_params.get('server')
        if server_id:
            return get_object_or_404(Server, pk=server_id)
        server_id = self.request.data.get('server')
        if server_id:
            return get_object_or_404(Server, pk=server_id)
        return None

    def get_queryset(self):
        queryset = Channel.objects.all()

        server_id = self.request.query_params.get('server')

        if server_id:
            queryset = queryset.filter(server_id=server_id)

        return queryset.select_related('server').order_by('created_at')

    def perform_create(self, serializer):
        server = self.get_server()
        if server is None:
            raise PermissionDenied('Server is required.')
        if not _can_manage_channels(self.request.user, server):
            raise PermissionDenied('You do not have permission to manage channels.')
        serializer.save(server=server)


class ChannelDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Channel.objects.select_related('server')

    def perform_update(self, serializer):
        if not _can_manage_channels(self.request.user, serializer.instance.server):
            raise PermissionDenied('You do not have permission to manage channels.')
        serializer.save()

    def perform_destroy(self, instance):
        if not _can_manage_channels(self.request.user, instance.server):
            raise PermissionDenied('You do not have permission to manage channels.')
        instance.delete()
