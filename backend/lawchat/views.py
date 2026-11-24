from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Conversation, Message
from .serializers import RegisterSerializer, ConversationSerializer, MessageSerializer
from .rag.pipeline import answer_question
User=get_user_model()
class HealthView(APIView):
    permission_classes=[permissions.AllowAny]
    def get(self, request): return Response({'status':'ok','service':'LawLens API'})
class RegisterView(generics.CreateAPIView):
    queryset=User.objects.all(); serializer_class=RegisterSerializer; permission_classes=[permissions.AllowAny]
class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class=ConversationSerializer
    def get_queryset(self): return Conversation.objects.filter(user=self.request.user).prefetch_related('messages')
    def perform_create(self, serializer): serializer.save(user=self.request.user)
class MessageListCreateView(APIView):
    def get(self, request, conversation_id):
        conversation=get_object_or_404(Conversation, id=conversation_id, user=request.user)
        return Response(MessageSerializer(conversation.messages.all(), many=True).data)
    def post(self, request, conversation_id):
        conversation=get_object_or_404(Conversation, id=conversation_id, user=request.user)
        prompt=str(request.data.get('message','')).strip()
        if not prompt: return Response({'detail':'Message is required.'}, status=400)
        return self._send(request, conversation, prompt)
    def _send(self, request, conversation, prompt):
        user_message=Message.objects.create(conversation=conversation, role='user', content=prompt)
        recent=list(conversation.messages.order_by('-created_at')[:8])[::-1]
        history=[{'role':m.role,'content':m.content} for m in recent if m.id != user_message.id]
        result=answer_question(prompt, history)
        assistant=Message.objects.create(conversation=conversation, role='assistant', content=result['answer'], sources=result['sources'])
        if conversation.title == 'New conversation':
            conversation.title=prompt[:55] or 'Legal question'; conversation.save(update_fields=['title','updated_at'])
        return Response({'conversation_id':conversation.id,'user_message':MessageSerializer(user_message).data,'assistant_message':MessageSerializer(assistant).data}, status=201)
class ChatView(APIView):
    def post(self, request):
        prompt=str(request.data.get('message','')).strip()
        if not prompt: return Response({'detail':'Message is required.'}, status=400)
        conversation_id=request.data.get('conversation_id')
        if conversation_id:
            conversation=get_object_or_404(Conversation, id=conversation_id, user=request.user)
        else:
            conversation=Conversation.objects.create(user=request.user, title=prompt[:55])
        return MessageListCreateView()._send(request, conversation, prompt)
