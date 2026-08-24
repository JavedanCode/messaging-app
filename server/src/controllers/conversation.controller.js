import {
  createConversation,
  deleteConversation,
  getConversationById,
  getUserConversations,
} from '../services/conversation.service.js';
import { emitConversationCreated } from '../sockets/conversation.socket.js';

export async function createConversationController(req, res) {
  const conversation = await createConversation(req.user.id, req.body);

  emitConversationCreated(
    conversation,
    conversation.members
      .map((member) => member.userId)
      .filter((memberId) => memberId !== req.user.id),
  );

  res.status(201).json({
    success: true,
    conversation,
  });
}

export async function getConversationsController(req, res) {
  const conversations = await getUserConversations(req.user.id);

  res.status(200).json({
    success: true,
    conversations,
  });
}

export async function getConversationController(req, res) {
  const conversation = await getConversationById(req.params.conversationId, req.user.id);

  res.status(200).json({
    success: true,
    conversation,
  });
}

export async function deleteConversationController(req, res) {
  await deleteConversation(req.params.conversationId, req.user.id);

  res.status(204).send();
}
