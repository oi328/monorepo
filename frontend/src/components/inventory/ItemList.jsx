
export default function ItemList({ items, onEdit, onDelete, onView }) {
  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-xl">
                    {item.icon || '📦'}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{item.category}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {item.type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {item.sku}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <span className={`text-sm font-medium ${item.stock < item.minStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                        {item.stock} {item.unit}
                    </span>
                    {item.stock < item.minStock && (
                        <AlertTriangle size={14} className="ml-1.5 text-red-500" />
                    )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {item.price}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  item.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {item.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => onView(item)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <Eye size={18} />
                    </button>
                    <button onClick={() => onEdit(item)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => onDelete(item)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No items found in this category.
          </div>
      )}
    </div>
  );
}
