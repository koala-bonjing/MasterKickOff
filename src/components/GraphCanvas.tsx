'use client';

import React, { useRef, useEffect, useState } from 'react';
import { SubgraphNode, SubgraphLink } from '@/lib/queries';

interface GraphCanvasProps {
  nodes: SubgraphNode[];
  links: SubgraphLink[];
  onNodeClick?: (node: SubgraphNode) => void;
  width?: number;
  height?: number;
}

interface SimNode extends SubgraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export function GraphCanvas({
  nodes,
  links,
  onNodeClick,
  height = 500,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const draggingNodeRef = useRef<SimNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize node physics and layout
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.clientWidth;
    const h = height;

    const getNodeColor = (type: string, isCenter?: boolean) => {
      if (isCenter) return '#a855f7'; // Bright Purple
      if (type === 'artist') return '#f43f5e'; // Rose
      if (type === 'band') return '#3b82f6'; // Blue
      if (type === 'track') return '#10b981'; // Emerald
      return '#64748b';
    };

    const getNodeRadius = (type: string, isCenter?: boolean) => {
      if (isCenter) return 22;
      if (type === 'artist') return 16;
      if (type === 'band') return 18;
      if (type === 'track') return 13;
      return 12;
    };

    // Arrange nodes in concentric rings around center
    const simNodes: SimNode[] = nodes.map((node, i) => {
      let x = w / 2;
      let y = h / 2;

      if (!node.isCenter) {
        const angle = (i / (nodes.length || 1)) * 2 * Math.PI;
        const dist = node.type === 'artist' ? 170 : 100;
        x = w / 2 + Math.cos(angle) * dist + (Math.random() - 0.5) * 40;
        y = h / 2 + Math.sin(angle) * dist + (Math.random() - 0.5) * 40;
      }

      return {
        ...node,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: getNodeRadius(node.type, node.isCenter),
        color: getNodeColor(node.type, node.isCenter),
      };
    });

    simNodesRef.current = simNodes;

    // Simulation step loop
    const step = () => {
      const currentNodes = simNodesRef.current;
      const kRepulsion = 1200;
      const kSpring = 0.04;
      const friction = 0.85;

      // 1. Repulsion between all node pairs
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const n1 = currentNodes[i];
          const n2 = currentNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = kRepulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (n1 !== draggingNodeRef.current && !n1.isCenter) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (n2 !== draggingNodeRef.current && !n2.isCenter) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Spring attraction along links
      links.forEach((link) => {
        const source = currentNodes.find((n) => n.id === link.source);
        const target = currentNodes.find((n) => n.id === link.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = source.isCenter || target.isCenter ? 120 : 90;
          const force = (dist - targetDist) * kSpring;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (source !== draggingNodeRef.current && !source.isCenter) {
            source.vx += fx;
            source.vy += fy;
          }
          if (target !== draggingNodeRef.current && !target.isCenter) {
            target.vx -= fx;
            target.vy -= fy;
          }
        }
      });

      // 3. Center gravity and bounds damping
      currentNodes.forEach((n) => {
        if (!n.isCenter && n !== draggingNodeRef.current) {
          const dx = w / 2 - n.x;
          const dy = h / 2 - n.y;
          n.vx += dx * 0.002;
          n.vy += dy * 0.002;

          n.vx *= friction;
          n.vy *= friction;
          n.x += n.vx;
          n.y += n.vy;

          // Boundary clamp
          n.x = Math.max(n.radius + 10, Math.min(w - n.radius - 10, n.x));
          n.y = Math.max(n.radius + 10, Math.min(h - n.radius - 10, n.y));
        } else if (n.isCenter) {
          n.x = w / 2;
          n.y = h / 2;
        }
      });

      // Render
      renderCanvas();
      animFrameRef.current = requestAnimationFrame(step);
    };

    const renderCanvas = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, canvas.clientWidth, height);

      // Draw Links
      ctx.lineWidth = 1.5;
      links.forEach((link) => {
        const s = simNodesRef.current.find((n) => n.id === link.source);
        const t = simNodesRef.current.find((n) => n.id === link.target);
        if (s && t) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
          ctx.stroke();
        }
      });

      // Draw Nodes
      simNodesRef.current.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
        ctx.fillStyle = n.color;
        ctx.shadowBlur = n.isCenter ? 15 : 6;
        ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        // Node Label
        ctx.font = `${n.isCenter ? 'bold 12px' : '10px'} -apple-system, sans-serif`;
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText(n.name.length > 15 ? `${n.name.slice(0, 13)}…` : n.name, n.x, n.y + n.radius + 14);
      });
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [nodes, links, height]);

  // Mouse event handlers (Drag, Hover, Click)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const clicked = simNodesRef.current.find((n) => {
      const dx = n.x - mx;
      const dy = n.y - my;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    if (clicked) {
      draggingNodeRef.current = clicked;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (draggingNodeRef.current) {
      draggingNodeRef.current.x = mx;
      draggingNodeRef.current.y = my;
    } else {
      const hovered = simNodesRef.current.find((n) => {
        const dx = n.x - mx;
        const dy = n.y - my;
        return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
      });
      setHoveredNode(hovered || null);
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeRef.current && onNodeClick) {
      onNodeClick(draggingNodeRef.current);
    }
    draggingNodeRef.current = null;
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-800 shadow-2xl">
      <canvas
        ref={canvasRef}
        className="w-full cursor-grab active:cursor-grabbing block"
        style={{ height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Legend Overlay */}
      <div className="absolute top-4 left-4 p-3 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 text-xs space-y-1.5 shadow-lg pointer-events-none">
        <p className="font-semibold text-slate-300 mb-1">Graph Legend</p>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm" />
          <span className="text-slate-300">Selected Artist (Center)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
          <span className="text-slate-300">Collaborating Artists</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
          <span className="text-slate-300">Bands</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
          <span className="text-slate-300">Shared Tracks</span>
        </div>
      </div>

      {/* Hover Info Tooltip */}
      {hoveredNode && (
        <div
          className="absolute bottom-4 right-4 p-3 bg-slate-900/95 backdrop-blur-md rounded-xl border border-indigo-500/40 text-xs shadow-2xl max-w-xs pointer-events-none animate-fadeIn"
        >
          <p className="font-bold text-white text-sm">{hoveredNode.name}</p>
          <p className="text-slate-400 capitalize">Type: {hoveredNode.type}</p>
          {hoveredNode.genre && <p className="text-indigo-300">Genre: {hoveredNode.genre}</p>}
          <p className="text-slate-500 text-[10px] mt-1">Click to center view</p>
        </div>
      )}
    </div>
  );
}
