import {
  createConversation,
  deleteConversation,
  getConversationById,
  getUserConversations,
} from '../services/conversation.service.js';

export async function createConversationController(req, res) {
  const conversation = await createConversation(req.user.id, req.body);

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
