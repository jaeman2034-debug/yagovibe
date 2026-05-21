/**
 * 심판 메모/특이사항 섹션
 * 분쟁 발생 시 증거 영역
 */

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Match, RefereeNote } from "@/types/tournament";
import { useAuth } from "@/context/AuthProvider";
import { FileText, Plus } from "lucide-react";
import { serverTimestamp } from "firebase/firestore";

interface MatchRefereeNotesSectionProps {
  match: Match;
  onUpdate: (updates: Partial<Match>) => Promise<void>;
}

export function MatchRefereeNotesSection({ match, onUpdate }: MatchRefereeNotesSectionProps) {
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const notes = match.refereeNotes || [];

  const handleAddNote = async () => {
    if (!noteContent.trim() || !user) return;

    const newNote: RefereeNote = {
      id: `${Date.now()}`,
      content: noteContent.trim(),
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      createdByName: user.displayName || "심판",
    };

    try {
      await onUpdate({
        refereeNotes: [...notes, newNote],
      });

      setNoteContent("");
      setShowAddForm(false);
    } catch (error) {
      console.error("메모 추가 오류:", error);
      alert("메모 추가에 실패했습니다.");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <Card className="rounded-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <h2 className="text-lg font-semibold">심판 메모 / 특이사항</h2>
          </div>
          {!showAddForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              메모 추가
            </Button>
          )}
        </div>

        {/* 메모 목록 */}
        {notes.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            기록된 메모가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {notes
              .slice()
              .reverse()
              .map((note) => (
                <div key={note.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium">{note.createdByName || "심판"}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(note.createdAt)}
                    </div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{note.content}</div>
                  {note.editedAt && (
                    <div className="text-xs text-muted-foreground mt-2">
                      수정: {formatDate(note.editedAt)}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* 추가 폼 */}
        {showAddForm && (
          <div className="mt-4 space-y-3 p-4 border rounded">
            <div>
              <label className="text-sm font-medium mb-1 block">메모 내용</label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="경기 중 특이사항, 분쟁 상황, 지연 사유 등을 기록하세요..."
                rows={4}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddNote} disabled={!noteContent.trim()} className="flex-1">
                추가
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNoteContent("");
                }}
              >
                취소
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

