from rest_framework import generics

from .models import Channel
from .serializers import ChannelSerializer


class ChannelListCreateView(generics.ListCreateAPIView):
    serializer_class = ChannelSerializer

    def get_queryset(self):
        queryset = Channel.objects.all()

        server_id = self.request.query_params.get('server')

        if server_id:
            queryset = queryset.filter(server_id=server_id)

        return queryset