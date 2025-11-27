import React from "react";

const bgClasses = {
  white: "bg-white",
  blue: "bg-blue-50",
  green: "bg-green-50",
  yellow: "bg-amber-50"
};

export default function TextNoteWidget({ config }) {
  const { content = "", background = "white" } = config;

  return (
    <div className={`h-full ${bgClasses[background]} rounded-lg p-3 overflow-auto`}>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{content || "Nota vazia..."}</p>
    </div>
  );
}