import json

from asgiref.sync import sync_to_async

from channels.generic.websocket import AsyncWebsocketConsumer

from .models import Message
from channels_app.models import Channel
from users.models import User


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.channel_id = self.scope['url_route']['kwargs']['channel_id']

        self.room_group_name = f'chat_{self.channel_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    @sync_to_async
    def save_message(self, user_id, channel_id, content):
        user = User.objects.get(id=user_id)

        channel = Channel.objects.get(id=channel_id)

        return Message.objects.create(
            author=user,
            channel=channel,
            content=content
        )

    async def receive(self, text_data):
        data = json.loads(text_data)

        message = data['message']
        user_id = data['user_id']

        saved_message = await self.save_message(
            user_id=user_id,
            channel_id=self.channel_id,
            content=message
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': saved_message.content,
                'author': saved_message.author.username,
                'created_at': str(saved_message.created_at)
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'author': event['author'],
            'created_at': event['created_at']
        }))