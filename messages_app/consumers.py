import json

from asgiref.sync import sync_to_async

from channels.generic.websocket import AsyncWebsocketConsumer

from .models import (
    DirectConversation,
    DirectMessage,
    Message,
)
from channels_app.models import Channel
from servers.models import ServerMember
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

        if channel.server.owner_id != user.id:
            member = ServerMember.objects.filter(
                server=channel.server,
                user=user,
            ).prefetch_related('roles').first()

            if not member or not (
                member.roles.filter(administrator=True).exists()
                or member.roles.filter(send_messages=True).exists()
            ):
                raise PermissionError('User cannot send messages in this channel.')

        return Message.objects.create(
            author=user,
            channel=channel,
            content=content
        )

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        data = json.loads(text_data)

        message = str(data.get('message', '')).strip()
        user_id = data.get('user_id')

        if not message or not user_id:
            return

        try:
            saved_message = await self.save_message(
                user_id=user_id,
                channel_id=self.channel_id,
                content=message
            )
        except PermissionError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'You do not have permission to send messages here.',
            }))
            await self.close()
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'id': saved_message.id,
                'channel': saved_message.channel_id,
                'content': saved_message.content,
                'author_id': saved_message.author_id,
                'author_username': saved_message.author.username,
                'created_at': str(saved_message.created_at),
                'edited_at': None,
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'id': event['id'],
            'channel': event['channel'],
            'content': event['content'],
            'author_id': event['author_id'],
            'author_username': event['author_username'],
            'created_at': event['created_at'],
            'edited_at': event['edited_at'],
        }))


class DirectMessageConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'dm_{self.conversation_id}'

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
    def save_message(self, user_id, conversation_id, content):
        user = User.objects.get(id=user_id)
        conversation = DirectConversation.objects.get(id=conversation_id)

        if not conversation.members.filter(id=user.id).exists():
            raise PermissionError('User cannot send messages in this conversation.')

        return DirectMessage.objects.create(
            author=user,
            conversation=conversation,
            content=content
        )

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        data = json.loads(text_data)

        message = str(data.get('message', '')).strip()
        user_id = data.get('user_id')

        if not message or not user_id:
            return

        try:
            saved_message = await self.save_message(
                user_id=user_id,
                conversation_id=self.conversation_id,
                content=message
            )
        except PermissionError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'You do not have permission to send messages here.',
            }))
            await self.close()
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'dm_message',
                'id': saved_message.id,
                'conversation': saved_message.conversation_id,
                'content': saved_message.content,
                'author_id': saved_message.author_id,
                'author_username': saved_message.author.username,
                'created_at': str(saved_message.created_at),
                'edited_at': None,
            }
        )

    async def dm_message(self, event):
        await self.send(text_data=json.dumps({
            'id': event['id'],
            'conversation': event['conversation'],
            'content': event['content'],
            'author_id': event['author_id'],
            'author_username': event['author_username'],
            'created_at': event['created_at'],
            'edited_at': event['edited_at'],
        }))
