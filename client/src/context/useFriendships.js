import { useContext } from "react";

import { FriendshipContext } from "./FriendshipContext";

export function useFriendships() {
  const context = useContext(FriendshipContext);
  if (!context)
    throw new Error("useFriendships must be used within a FriendshipProvider.");
  return context;
}
