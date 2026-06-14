import React from "react";

interface VersionBadgeProps {
  version: number;
  className?: string;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({ version, className = "" }) => {
  return (
    <span
      className={`text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded font-medium ${className}`}
    >
      V{version}
    </span>
  );
};
