from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    DirectConversation,
    DirectConversationMember,
    DirectMessage,
    Message,
)
from .serializers import (
    DirectConversationSerializer,
    DirectMessageSerializer,
    MessageSerializer,
)
from servers.models import ServerMember
from users.models import User


def _can_send_message(user, channel):
    if channel.server.owner_id == user.id:
        return True

    member = ServerMember.objects.filter(
        server=channel.server,
        user=user,
    ).prefetch_related('roles').first()

    if not member:
        return False

    return (
        member.roles.filter(administrator=True).exists()
        or member.roles.filter(send_messages=True).exists()
    )


def _can_view_direct_conversation(user, conversation):
    return conversation.members.filter(id=user.id).exists()


def _get_or_create_direct_conversation(user, other_user):
    with transaction.atomic():
        existing = (
            DirectConversation.objects
            .filter(members=user)
            .filter(members=other_user)
            .distinct()
            .first()
        )
        if existing:
            return existing

        conversation = DirectConversation.objects.create()
        DirectConversationMember.objects.create(conversation=conversation, user=user)
        DirectConversationMember.objects.create(conversation=conversation, user=other_user)
        return conversation


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Message.objects.all()

        channel_id = self.request.query_params.get('channel')

        if channel_id:
            queryset = queryset.filter(
                channel_id=channel_id
            )

        return queryset.select_related(
            'author',
            'channel',
            'channel__server',
        ).order_by('created_at')

    def perform_create(self, serializer):
        channel = serializer.validated_data['channel']
        if not _can_send_message(self.request.user, channel):
            raise PermissionDenied('You do not have permission to send messages here.')

        serializer.save(author=self.request.user)


class DirectConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = DirectConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            DirectConversation.objects
            .filter(members=self.request.user)
            .prefetch_related('members', 'messages__author')
            .order_by('-updated_at')
        )

    def create(self, request, *args, **kwargs):
        username = str(request.data.get('username', '')).strip()
        user_id = request.data.get('user_id')

        if not username and not user_id:
            raise ValidationError({'username': 'A username or user_id is required.'})

        other_user = None
        if user_id:
            other_user = get_object_or_404(User, pk=user_id)
        else:
            other_user = get_object_or_404(User, username=username)

        if other_user.id == request.user.id:
            raise PermissionDenied('You cannot create a conversation with yourself.')

        conversation = _get_or_create_direct_conversation(request.user, other_user)
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)


class DirectConversationMessageListCreateView(generics.ListCreateAPIView):
    serializer_class = DirectMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_conversation(self):
        return get_object_or_404(DirectConversation, pk=self.kwargs['conversation_id'])

    def get_queryset(self):
        conversation = self.get_conversation()
        if not _can_view_direct_conversation(self.request.user, conversation):
            raise PermissionDenied('You do not have access to this conversation.')
        return conversation.messages.select_related('author').order_by('created_at')

    def perform_create(self, serializer):
        conversation = self.get_conversation()
        if not _can_view_direct_conversation(self.request.user, conversation):
            raise PermissionDenied('You do not have access to this conversation.')
        serializer.save(author=self.request.user, conversation=conversation)
