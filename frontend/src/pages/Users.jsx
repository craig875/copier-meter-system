import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { trimLeading } from '../utils/string';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  Check,
  Shield,
  User as UserIcon,
  Printer,
  UserCog,
} from 'lucide-react';
import clsx from 'clsx';
import { MODULE_OPTIONS } from '../constants/modules';

const Users = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries(['users']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    },
  });

  const users = data?.users || [];

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDelete = (user) => {
    if (user.id === currentUser.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (window.confirm(`Delete user ${user.name}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div data-tour="users-content" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500">Manage system users and permissions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <div 
            key={user.id} 
            className={clsx(
              'bg-white rounded-lg shadow-sm p-4 border-2',
              user.id === currentUser.id ? 'border-red-200' : 'border-transparent'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  user.role === 'admin' ? 'bg-purple-100'
                    : user.role === 'manager' ? 'bg-indigo-100'
                    : user.role === 'meter_user' ? 'bg-green-100'
                    : 'bg-gray-100'
                )}>
                  {user.role === 'admin' ? (
                    <Shield className="h-5 w-5 text-purple-600" />
                  ) : user.role === 'manager' ? (
                    <UserCog className="h-5 w-5 text-indigo-600" />
                  ) : user.role === 'meter_user' ? (
                    <Printer className="h-5 w-5 text-green-600" />
                  ) : user.role === 'capturer' ? (
                    <Printer className="h-5 w-5 text-blue-600" />
                  ) : (
                    <UserIcon className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">
                    {user.name}
                    {user.id === currentUser.id && (
                      <span className="ml-2 text-xs text-blue-600">(You)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(user)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  disabled={user.id === currentUser.id}
                  className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className={clsx(
                  'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : user.role === 'manager'
                    ? 'bg-indigo-100 text-indigo-800'
                    : user.role === 'meter_user'
                    ? 'bg-green-100 text-green-700'
                    : user.role === 'capturer'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                )}>
                  {user.role === 'admin' ? 'Administrator'
                    : user.role === 'manager' ? 'Manager'
                    : user.role === 'meter_user' ? 'Meter User'
                    : user.role === 'capturer' ? 'Capturer'
                    : 'Unknown'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              {user.branch && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Branch:</span>
                  <span className={clsx(
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                    user.branch === 'JHB' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  )}>
                    {user.branch}
                  </span>
                </div>
              )}
              {user.role === 'admin' ? (
                <p className="text-xs text-gray-500">Modules: all (administrator)</p>
              ) : Array.isArray(user.modules) && user.modules.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500">Modules:</span>
                  {user.modules.map((m) => (
                    <span
                      key={m}
                      className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700"
                    >
                      {m === 'copiers' ? 'Copiers' : m === 'connectivity' ? 'Connectivity' : m}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <UserModal
          user={editingUser}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

const UserModal = ({ user, onClose }) => {
  const queryClient = useQueryClient();
  const isEditing = !!user;

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'meter_user',
    branch: user?.branch || 'JHB',
    modules:
      user?.role === 'admin'
        ? ['copiers', 'connectivity', 'fibre-orders']
        : Array.isArray(user?.modules) && user.modules.length > 0
          ? [...user.modules]
          : ['copiers'],
  });

  const validateForm = () => {
    if (!formData.branch || (formData.branch !== 'JHB' && formData.branch !== 'CT')) {
      toast.error('Branch is required');
      return false;
    }
    return true;
  };

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data };
      if (!payload.password) delete payload.password;
      if (payload.role === 'admin') {
        delete payload.modules;
      }
      return isEditing 
        ? usersApi.update(user.id, payload)
        : usersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? 'User updated' : 'User created');
      queryClient.invalidateQueries(['users']);
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Operation failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEditing && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }
    if (!validateForm()) {
      return;
    }
    if (formData.role !== 'admin' && (!formData.modules || formData.modules.length === 0)) {
      toast.error('Select at least one module');
      return;
    }
    mutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value, tagName } = e.target;
    const v = tagName === 'SELECT' ? value : (typeof value === 'string' ? trimLeading(value) : value);
    setFormData((prev) => {
      const next = { ...prev, [name]: v };
      if (name === 'role' && v === 'admin') {
        next.modules = ['copiers', 'connectivity', 'fibre-orders'];
      }
      if (name === 'role' && v === 'sales_agent') {
        next.modules = ['fibre-orders'];
      }
      if (name === 'role' && v !== 'admin' && (!next.modules || next.modules.length === 0)) {
        next.modules = ['copiers'];
      }
      return next;
    });
  };

  const toggleModule = (key) => {
    if (formData.role === 'admin') return;
    if (formData.role === 'sales_agent') return;
    setFormData((prev) => {
      const set = new Set(prev.modules || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, modules: [...set] };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit User' : 'Add User'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[85vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {isEditing ? '(leave blank to keep current)' : '*'}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!isEditing}
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="meter_user">Meter User</option>
              <option value="capturer">Capturer</option>
              <option value="sales_agent">Sales Agent</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch *
            </label>
            <select
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="JHB">Johannesburg (JHB)</option>
              <option value="CT">Cape Town (CT)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Every user must belong to exactly one branch.
            </p>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Module access</span>
            {formData.role === 'admin' ? (
              <p className="text-sm text-gray-500">
                Administrators have access to all modules (Copiers and Connectivity).
              </p>
            ) : formData.role === 'sales_agent' ? (
              <p className="text-sm text-gray-600 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <strong>Fibre Orders</strong> — read-only access to orders assigned to this sales agent.
                Administrators create orders and allocate them via the Sales Agent field.
              </p>
            ) : (
              <div className="space-y-2">
                {MODULE_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.modules?.includes(opt.key) ?? false}
                      onChange={() => toggleModule(opt.key)}
                      className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{opt.label}</span>
                      <span className="block text-xs text-gray-500">{opt.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4 mr-2" />
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Users;
