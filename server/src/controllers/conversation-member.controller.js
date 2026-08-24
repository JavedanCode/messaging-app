import {
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  updateMemberRole,
  updateGroupName,
} from '../services/conversation-member.service.js';

export async function addGroupMemberController(req, res) {
  const member = await addGroupMember({
    conversationId: req.params.conversationId,
    requesterId: req.user.id,
    userId: req.body.userId,
  });

  res.status(201).json({
    success: true,
    member,
  });
}

export async function removeGroupMemberController(req, res) {
  await removeGroupMember({
    conversationId: req.params.conversationId,
    requesterId: req.user.id,
    userId: req.params.userId,
  });

  res.status(204).send();
}

export async function leaveGroupController(req, res) {
  await leaveGroup({
    conversationId: req.params.conversationId,
    userId: req.user.id,
  });

  res.status(204).send();
}

export async function updateMemberRoleController(req, res) {
  const member = await updateMemberRole({
    conversationId: req.params.conversationId,
    requesterId: req.user.id,
    userId: req.params.userId,
    role: req.body.role,
  });

  res.status(200).json({
    success: true,
    member,
  });
}

export async function updateGroupNameController(req, res) {
  const conversation = await updateGroupName({
    conversationId: req.params.conversationId,
    requesterId: req.user.id,
    name: req.body.name,
  });

  res.status(200).json({
    success: true,
    conversation,
  });
}
