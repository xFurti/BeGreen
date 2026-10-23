import { Redirect, useLocalSearchParams } from "expo-router";
import { legacyGroupId } from "@/services/groups";

export default function SquadRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: "/community/[id]", params: { id: legacyGroupId(id) } }} />;
}
