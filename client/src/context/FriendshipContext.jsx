import { createContext, useEffect, useState } from "react";

import {
  acceptFriendRequest,
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "../api/friendships";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const FriendshipContext = createContext(null);

export function FriendshipProvider({ children }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    onFriendRequest,
    onFriendRequestAccepted,
    onFriendRequestRejected,
    onFriendRemoved,
    onPresenceOnline,
    onPresenceOffline,
  } = useSocket();
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    let cancelled = false;
    Promise.all([getFriends(), getIncomingRequests(), getOutgoingRequests()])
      .then(([friendsResponse, incomingResponse, outgoingResponse]) => {
        if (cancelled) return;
        setFriends(friendsResponse.friends);
        setIncomingRequests(incomingResponse.requests);
        setOutgoingRequests(outgoingResponse.requests);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    const unsubscribeRequest = onFriendRequest((request) => {
      setIncomingRequests((current) =>
        current.some((item) => item.id === request.id)
          ? current
          : [...current, request],
      );
    });
    const unsubscribeAccepted = onFriendRequestAccepted((friendship) => {
      setIncomingRequests((current) =>
        current.filter((item) => item.id !== friendship.id),
      );
      setOutgoingRequests((current) =>
        current.filter((item) => item.id !== friendship.id),
      );
      setFriends((current) => {
        const friend =
          friendship.requesterId === user?.id
            ? friendship.receiver
            : friendship.requester;
        return friend && !current.some((item) => item.id === friend.id)
          ? [...current, friend]
          : current;
      });
    });
    const unsubscribeRejected = onFriendRequestRejected((friendship) => {
      setIncomingRequests((current) =>
        current.filter((item) => item.id !== friendship.id),
      );
      setOutgoingRequests((current) =>
        current.filter((item) => item.id !== friendship.id),
      );
    });
    const unsubscribeRemoved = onFriendRemoved(({ userId, friendId }) => {
      setFriends((current) =>
        current.filter(
          (friend) => friend.id !== userId && friend.id !== friendId,
        ),
      );
    });
    const updatePresence = (userId, online) =>
      setFriends((current) =>
        current.map((friend) =>
          friend.id === userId ? { ...friend, online } : friend,
        ),
      );
    const unsubscribeOnline = onPresenceOnline((event) =>
      updatePresence(event.userId, true),
    );
    const unsubscribeOffline = onPresenceOffline((event) =>
      updatePresence(event.userId, false),
    );

    return () => {
      unsubscribeRequest();
      unsubscribeAccepted();
      unsubscribeRejected();
      unsubscribeRemoved();
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }, [
    user?.id,
    onFriendRequest,
    onFriendRequestAccepted,
    onFriendRequestRejected,
    onFriendRemoved,
    onPresenceOnline,
    onPresenceOffline,
  ]);

  async function sendRequest(userId) {
    await sendFriendRequest(userId);
  }

  async function acceptRequest(friendshipId) {
    const response = await acceptFriendRequest(friendshipId);
    const friendship = response.friendship;
    setIncomingRequests((current) =>
      current.filter((item) => item.id !== friendshipId),
    );
    const friend = friendship.requester;
    setFriends((current) =>
      current.some((item) => item.id === friend.id)
        ? current
        : [...current, friend],
    );
  }

  async function rejectRequest(friendshipId) {
    await rejectFriendRequest(friendshipId);
    setIncomingRequests((current) =>
      current.filter((item) => item.id !== friendshipId),
    );
  }

  async function remove(userId) {
    await removeFriend(userId);
    setFriends((current) => current.filter((friend) => friend.id !== userId));
  }

  return (
    <FriendshipContext.Provider
      value={{
        friends,
        incomingRequests,
        outgoingRequests,
        loading,
        sendRequest,
        acceptRequest,
        rejectRequest,
        remove,
      }}
    >
      {children}
    </FriendshipContext.Provider>
  );
}

export { FriendshipContext };
