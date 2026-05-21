/**
 * 🔥 Search Autocomplete 컴포넌트
 * 
 * 역할:
 * - 검색 자동완성
 * - Header에 통합
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchAutocomplete, type SearchIndexItem } from "@/services/searchService";
import { Input } from "@/components/ui/input";
import { Users, Target, Trophy, Search } from "lucide-react";

interface SearchAutocompleteProps {
  className?: string;
  placeholder?: string;
}

export function SearchAutocomplete({
  className = "",
  placeholder = "팀, 선수, 대회 검색...",
}: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchIndexItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const searchResults = await searchAutocomplete(query, 5);
        setResults(searchResults);
        setShowResults(searchResults.length > 0);
      } catch (error) {
        console.error("검색 실패:", error);
        setResults([]);
        setShowResults(false);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // 외부 클릭 시 결과 숨김
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchIndexItem) => {
    setQuery("");
    setShowResults(false);
    navigate(item.url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowResults(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const getIcon = (entityType: string) => {
    switch (entityType) {
      case "player":
        return <Users className="w-4 h-4" />;
      case "team":
        return <Target className="w-4 h-4" />;
      case "event":
        return <Trophy className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) {
                setShowResults(true);
              }
            }}
            className="pl-10 pr-4 w-full"
          />
        </div>
      </form>

      {/* Autocomplete Results */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex-shrink-0">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    {getIcon(item.entityType)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {item.title}
                </div>
                <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
