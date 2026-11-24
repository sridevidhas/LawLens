from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Conversation, Message
User = get_user_model()
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    class Meta: model=User; fields=('id','username','password')
    def create(self, validated_data): return User.objects.create_user(**validated_data)
class MessageSerializer(serializers.ModelSerializer):
    class Meta: model=Message; fields=('id','role','content','sources','created_at')
class ConversationSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    class Meta: model=Conversation; fields=('id','title','created_at','updated_at','last_message')
    def get_last_message(self, obj):
        msg = obj.messages.last()
        return msg.content[:120] if msg else ''
