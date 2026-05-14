from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Message
from .serializers import MessageSerializer


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

        return queryset.order_by('created_at')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)