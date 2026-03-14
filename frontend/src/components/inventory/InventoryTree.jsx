import { useState } from 'react';

const TreeNode = ({ node, onSelect, selectedId, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    onSelect(node);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect(node);
    if (hasChildren && !isOpen) {
        setIsOpen(true);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'family': return <Layers size={16} className="text-blue-500" />;
      case 'category': return <Folder size={16} className="text-yellow-500" />;
      case 'group': return <Package size={16} className="text-orange-500" />;
      case 'item': return <Box size={16} className="text-green-500" />;
      default: return <Folder size={16} />;
    }
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1.5 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        <span 
          className={`mr-1 p-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${hasChildren ? 'visible' : 'invisible'}`}
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="mr-2 opacity-80">{getIcon(node.type)}</span>
        <span className="truncate text-sm">{node.name}</span>
        {node.count !== undefined && (
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {node.count}
          </span>
        )}
      </div>
      {isOpen && hasChildren && (
        <div className="animate-in slide-in-from-top-1 duration-200">
          {node.children.map(child => (
            <TreeNode 
              key={child.id} 
              node={child} 
              onSelect={onSelect} 
              selectedId={selectedId} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function InventoryTree({ data, onSelect, selectedId }) {
  return (
    <div className="h-full overflow-y-auto py-2">
      {data.map(node => (
        <TreeNode 
          key={node.id} 
          node={node} 
          onSelect={onSelect} 
          selectedId={selectedId} 
        />
      ))}
    </div>
  );
}
