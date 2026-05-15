from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.utils import ProgrammingError
from rest_framework import generics, permissions
from rest_framework.exceptions import APIException, PermissionDenied

from .models import Server, ServerMember, ServerRole
from .serializers import (
    ServerMemberSerializer,
    ServerRoleSerializer,
    ServerSerializer,
)


def _ensure_owner(user, server):
    if server.owner_id != user.id:
        raise PermissionDenied('Only the server owner can manage this resource.')


class SchemaNotReady(APIException):
    status_code = 503
    default_detail = (
        'Database schema is not ready yet. Run migrations before creating servers.'
    )
    default_code = 'schema_not_ready'


class ServerListCreateView(generics.ListCreateAPIView):
    queryset = Server.objects.all()
    serializer_class = ServerSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return super().get_queryset().select_related('owner').prefetch_related(
            'roles',
            'members',
            'channels',
        ).order_by('created_at')

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                server = serializer.save(owner=self.request.user)

                default_role = ServerRole.objects.create(
                    server=server,
                    name='@everyone',
                    position=0,
                    view_channel=True,
                    send_messages=True,
                    embed_links=True,
                    attach_files=True,
                    read_message_history=True,
                    add_reactions=True,
                    use_voice_activity=True,
                    change_nickname=True,
                    is_default=True,
                )
                admin_role = ServerRole.objects.create(
                    server=server,
                    name='Admin',
                    position=1,
                    color='#7c3aed',
                    administrator=True,
                    hoist=True,
                    mentionable=True,
                )

                member = ServerMember.objects.create(server=server, user=self.request.user)
                member.roles.set([default_role, admin_role])
        except ProgrammingError as exc:
            raise SchemaNotReady() from exc


class ServerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServerSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Server.objects.select_related('owner').prefetch_related(
            'roles',
            'members',
            'channels',
        )

    def perform_update(self, serializer):
        _ensure_owner(self.request.user, serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_owner(self.request.user, instance)
        instance.delete()


class ServerRoleListCreateView(generics.ListCreateAPIView):
    serializer_class = ServerRoleSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_server(self):
        return get_object_or_404(Server, pk=self.kwargs['server_id'])

    def get_queryset(self):
        server = self.get_server()
        return server.roles.select_related('server').prefetch_related('members')

    def perform_create(self, serializer):
        server = self.get_server()
        _ensure_owner(self.request.user, server)
        serializer.save(server=server)


class ServerRoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServerRoleSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return ServerRole.objects.select_related('server')

    def perform_update(self, serializer):
        _ensure_owner(self.request.user, serializer.instance.server)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_owner(self.request.user, instance.server)
        if instance.is_default:
            raise PermissionDenied('The default role cannot be deleted.')
        instance.delete()


class ServerMemberListCreateView(generics.ListCreateAPIView):
    serializer_class = ServerMemberSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_server(self):
        return get_object_or_404(Server, pk=self.kwargs['server_id'])

    def get_queryset(self):
        server = self.get_server()
        return server.members.select_related('user', 'server').prefetch_related('roles')

    def perform_create(self, serializer):
        server = self.get_server()
        _ensure_owner(self.request.user, server)
        member = serializer.save(server=server)

        default_role = server.roles.filter(is_default=True).first()
        if default_role:
            member.roles.add(default_role)


class ServerMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServerMemberSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return ServerMember.objects.select_related('user', 'server').prefetch_related('roles')

    def perform_update(self, serializer):
        _ensure_owner(self.request.user, serializer.instance.server)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_owner(self.request.user, instance.server)
        if instance.user_id == instance.server.owner_id:
            raise PermissionDenied('The server owner cannot be removed.')
        instance.delete()
