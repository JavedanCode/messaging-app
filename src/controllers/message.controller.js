import { createMessage, getConversationMessages } from '../services/message.service.js';

export async function createMessageController(req, res) {
  const message = await createMessage(req.params.conversationId, req.user.id, req.body);

  res.status(201).json({
    success: true,
    message,
  });
}

export async function getConversationMessagesController(req, res) {
  const messages = await getConversationMessages(
    req.params.conversationId,
    req.user.id,
    res.locals.query.limit,
  );

  res.status(200).json({
    success: true,
    messages,
  });
}
