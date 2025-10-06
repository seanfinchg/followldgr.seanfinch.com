import React from "react";
import type { BasicUser, CategoryKey, LDGRJson, SortMode } from "../types";
import UserCard from "./UserCard";
import { paginate } from "../lib/utils";
import { Box } from "@mui/material";

type Props = {
  users: BasicUser[];
  category: CategoryKey;
  page: number;
  pageSize: number;
  sort: SortMode;
  alphaHeaders: boolean;
  alphaOf: (u: BasicUser) => string;
  onToggleWhitelist: (u: BasicUser) => void;
  onMergeRequest?: (u: BasicUser) => void;
  ranges?: Map<string, { from?: string; to?: string }>;
};

export default function UserList({
  users,
  category,
  page,
  pageSize,
  sort,
  alphaHeaders,
  alphaOf,
  onToggleWhitelist,
  onMergeRequest,
  ranges,
}: Props) {
  const pageItems = paginate(users, page, pageSize);

  let currentHeader = "";
  return (
    <Box
      className="w-full"
      sx={{ width: "100%", display: "flex", flexDirection: "column" }}
    >
      {pageItems.map((u) => {
        const head = alphaHeaders ? alphaOf(u) : "";
        const showHeader = alphaHeaders && head && head !== currentHeader;
        if (showHeader) currentHeader = head;

        return (
          <React.Fragment key={u.username}>
            {showHeader && (
              <div className="sticky top-[108px] z-10 rounded-md bg-neutral-200/60 px-2 py-1 text-sm font-semibold text-neutral-700 backdrop-blur dark:bg-neutral-800/60 dark:text-neutral-200 mb-2 w-full">
                {head}
              </div>
            )}
            <UserCard
              user={u}
              category={category}
              onToggleWhitelist={onToggleWhitelist}
              onMergeRequest={onMergeRequest}
              range={ranges?.get(u.username.toLowerCase())}
            />
          </React.Fragment>
        );
      })}
    </Box>
  );
}
