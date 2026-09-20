"use client";

import { useMemo, useState } from "react";
import { ArrowRight, GitBranch, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildPortfolio,
  type PortfolioActivity,
  type InquirySuggestion,
} from "@/lib/portfolio";

export function PortfolioSupport({
  career,
  activities,
  onOpen,
  onStart,
  graphOnly = false,
}: {
  career: string;
  activities: PortfolioActivity[];
  onOpen: (id: string) => void;
  onStart?: (suggestion: InquirySuggestion) => void;
  graphOnly?: boolean;
}) {
  const analysis = useMemo(
    () => buildPortfolio(career, activities),
    [career, activities],
  );
  const [selection, setSelected] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const nodes = showAll ? analysis.records : analysis.records.slice(-18);
  const selected = nodes.some((node) => node.id === selection)
    ? selection
    : nodes.at(-1)?.id;
  const height = Math.max(160, Math.ceil(nodes.length / 3) * 150);
  const positions = new Map(
    nodes.map((node, i) => [
      node.id,
      { x: 30 + (i % 3) * 300, y: 30 + Math.floor(i / 3) * 150 },
    ]),
  );
  const visibleEdges = analysis.edges.filter(
    (edge) =>
      positions.has(edge.source) &&
      positions.has(edge.target) &&
      (edge.kind === "explicit" ||
        edge.source === selected ||
        edge.target === selected),
  );
  return (
    <div className="portfolio-support">
      {!graphOnly && (
        <section className="support-recommendations">
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                <Lightbulb />
                기록에서 다음 행동으로
              </span>
              <h2>진로 심화활동 제안</h2>
              <p>
                {career} · 누적 {activities.length}개 기록을 바탕으로
                제안합니다.
              </p>
            </div>
            <span className="analysis-source">기본 분석 · 외부 AI 미사용</span>
          </div>
          <div className="recommendation-grid">
            {analysis.suggestions.map((suggestion, i) => (
              <article key={suggestion.id}>
                <span className="suggestion-number">0{i + 1}</span>
                <h3>{suggestion.title}</h3>
                <p className="inquiry-question">{suggestion.question}</p>
                <dl>
                  <dt>제안 이유</dt>
                  <dd>{suggestion.reason}</dd>
                  <dt>실행 방법</dt>
                  <dd>{suggestion.method}</dd>
                  <dt>남길 결과물</dt>
                  <dd>{suggestion.output}</dd>
                </dl>
                {onStart && (
                  <Button onClick={() => onStart(suggestion)}>
                    이 제안으로 과제 작성 <ArrowRight />
                  </Button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="connection-panel">
        <div className="section-heading">
          <div>
            <span className="section-kicker">
              <GitBranch />
              탐구 연결 지도
            </span>
            <h2>활동들이 어떻게 이어지고 있나요?</h2>
            <p>
              실선은 직접 연결, 점선은 공통 개념 2개 이상으로 추정한 연결입니다.
              연결이 없어도 의미 없는 활동이라는 뜻은 아닙니다.
            </p>
          </div>
        </div>
        <div className="connection-stats">
          <span>
            기록 <b>{analysis.records.length}</b>
          </span>
          <span>
            직접 연결 <b>{analysis.explicitCount}</b>
          </span>
          <span>
            공통 개념 <b>{analysis.covered.length}</b>
          </span>
          <span>
            연결 근거 미확인 <b>{analysis.isolated.length}</b>
          </span>
        </div>
        {nodes.length > 0 && (
          <label className="connection-selector">
            연결 근거를 확인할 활동 (점선은 선택한 활동 기준)
            <select
              className="form-select"
              value={selected ?? ""}
              onChange={(event) => setSelected(event.target.value)}
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {!nodes.length ? (
          <div className="empty-state">
            <GitBranch />
            <h3>첫 탐구를 기록하면 지도가 시작됩니다</h3>
            <p>다음 과제를 작성할 때 ‘이어지는 이전 활동’을 선택해 보세요.</p>
          </div>
        ) : (
          <>
            <div className="connection-canvas">
              <svg
                viewBox={`0 0 930 ${height}`}
                role="img"
                aria-label="시간순 활동 연결 그래프. 아래 활동 목록에서도 동일한 내용을 확인할 수 있습니다."
              >
                {visibleEdges.map((edge) => {
                  const a = positions.get(edge.source)!;
                  const b = positions.get(edge.target)!;
                  return (
                    <path
                      key={`${edge.source}-${edge.target}`}
                      d={`M${a.x + 125},${a.y + 85} C${a.x + 125},${a.y + 125} ${b.x + 125},${b.y - 25} ${b.x + 125},${b.y}`}
                      fill="none"
                      stroke={edge.kind === "explicit" ? "#415cc9" : "#9ba8c1"}
                      strokeWidth={
                        selected === edge.source || selected === edge.target
                          ? 4
                          : 2
                      }
                      strokeDasharray={
                        edge.kind === "suggested" ? "6 5" : undefined
                      }
                    >
                      <title>{edge.reason}</title>
                    </path>
                  );
                })}
                {nodes.map((node) => {
                  const p = positions.get(node.id)!;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${p.x} ${p.y})`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${node.title} 연결 근거 보기`}
                      onClick={() => setSelected(node.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelected(node.id);
                        }
                      }}
                    >
                      <rect
                        width="250"
                        height="85"
                        rx="12"
                        fill={selected === node.id ? "#edf1ff" : "#fff"}
                        stroke={selected === node.id ? "#415cc9" : "#d7deeb"}
                        strokeWidth="2"
                      />
                      <text x="14" y="25" fill="#647392" fontSize="12">
                        {node.category}
                      </text>
                      <text
                        x="14"
                        y="49"
                        fill="#172747"
                        fontSize="15"
                        fontWeight="700"
                      >
                        {node.title.length > 16
                          ? `${node.title.slice(0, 16)}…`
                          : node.title}
                      </text>
                      <text x="14" y="70" fill="#647392" fontSize="12">
                        {new Date(node.createdAt).toLocaleDateString("ko-KR")}
                      </text>
                      <title>{node.title}</title>
                    </g>
                  );
                })}
              </svg>
            </div>
            {analysis.records.length > 18 && (
              <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                {showAll
                  ? "최근 18개만 보기"
                  : `전체 ${analysis.records.length}개 펼치기`}
              </Button>
            )}
            <div className="connection-list">
              {nodes
                .filter((node) => !selected || node.id === selected)
                .map((node) => {
                  const edges = analysis.edges.filter(
                    (edge) =>
                      edge.source === node.id || edge.target === node.id,
                  );
                  return (
                    <article key={node.id}>
                      <button onClick={() => onOpen(node.id)}>
                        <b>{node.title}</b>
                        <ArrowRight size={16} />
                      </button>
                      {edges.length ? (
                        <ul>
                          {edges.map((edge) => (
                            <li key={`${edge.source}-${edge.target}`}>
                              <b>
                                {
                                  analysis.records.find(
                                    (record) =>
                                      record.id ===
                                      (edge.source === node.id
                                        ? edge.target
                                        : edge.source),
                                  )?.title
                                }
                              </b>
                              <span>{edge.reason}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>
                          현재 확인된 연결이 없습니다. 이전 활동과의 관계를
                          답변에 설명하거나 결과물 수정에서 직접 연결하세요.
                        </p>
                      )}
                    </article>
                  );
                })}
              {selected && (
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  최근 활동의 연결 보기
                </Button>
              )}
            </div>
          </>
        )}
        <p className="analysis-footnote">
          전공 적합성이나 입학 가능성을 판정하는 평가가 아닙니다. 현재 설정한
          진로와 작성된 문장·연결 정보를 확인하는 참고 자료입니다.
        </p>
      </section>
    </div>
  );
}
