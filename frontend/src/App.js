import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} />
      <div className="flex">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} user={user} />
        <MainContent currentView={currentView} user={user} />
      </div>
    </div>
  );
}

// Authentication Component
function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'User',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await axios.post(`${API_URL}${endpoint}`, formData);
      
      if (isLogin) {
        onLogin(response.data.user, response.data.access_token);
      } else {
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const roles = ['Admin', 'QualityManager', 'RegulatoryAffairs', 'ClinicalResearch', 'Manufacturing', 'User'];
  const departments = ['Quality Assurance', 'Regulatory Affairs', 'Clinical Research', 'Manufacturing', 'R&D', 'IT'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">PharmaVault</h1>
            <p className="text-gray-600">Electronic Document Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                isLogin ? 'Sign In' : 'Register'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Header Component
function Header({ user, onLogout }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">PharmaVault</h1>
            <span className="text-sm text-gray-500">Electronic Document Management System</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
              <p className="text-xs text-gray-500">{user.role} • {user.department}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// Sidebar Component
function Sidebar({ currentView, setCurrentView, user }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'upload', label: 'Upload Document', icon: '📤' },
    { id: 'workflow', label: 'Workflow', icon: '🔄' },
    { id: 'search', label: 'Search', icon: '🔍' },
    ...(user.role === 'Admin' || user.role === 'QualityManager' ? [
      { id: 'audit', label: 'Audit Trail', icon: '🔍' }
    ] : [])
  ];

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => setCurrentView(item.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                  currentView === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

// Main Content Component
function MainContent({ currentView, user }) {
  switch (currentView) {
    case 'dashboard':
      return <Dashboard user={user} />;
    case 'documents':
      return <DocumentList user={user} />;
    case 'upload':
      return <UploadDocument user={user} />;
    case 'workflow':
      return <WorkflowManagement user={user} />;
    case 'search':
      return <SearchDocuments user={user} />;
    case 'audit':
      return <AuditTrail user={user} />;
    default:
      return <Dashboard user={user} />;
  }
}

// Dashboard Component
function Dashboard({ user }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">Welcome back, {user.full_name}</p>
      </div>

      {dashboardData && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Documents" value={dashboardData.stats.total_documents} icon="📄" color="blue" />
            <StatCard title="Pending Approvals" value={dashboardData.stats.pending_approvals} icon="⏳" color="yellow" />
            <StatCard title="Approved Documents" value={dashboardData.stats.approved_documents} icon="✅" color="green" />
            <StatCard title="Draft Documents" value={dashboardData.stats.draft_documents} icon="📝" color="gray" />
          </div>

          {/* Charts and Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Documents */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h3>
              <div className="space-y-3">
                {dashboardData.recent_documents.slice(0, 5).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{doc.title}</p>
                      <p className="text-sm text-gray-500">{doc.document_type} • {doc.status}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Types */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Types</h3>
              <div className="space-y-3">
                {dashboardData.document_types.map(type => (
                  <div key={type._id} className="flex items-center justify-between">
                    <span className="text-gray-700">{type._id}</span>
                    <span className="font-semibold text-gray-900">{type.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Document List Component
function DocumentList({ user }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [filters, setFilters] = useState({
    document_type: '',
    status: ''
  });

  useEffect(() => {
    loadDocuments();
  }, [filters]);

  const loadDocuments = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.document_type) params.append('document_type', filters.document_type);
      if (filters.status) params.append('status', filters.status);
      
      const response = await axios.get(`${API_URL}/api/documents?${params}`);
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (docId, stepIndex) => {
    try {
      await axios.post(`${API_URL}/api/documents/${docId}/approve`, {
        step_index: stepIndex,
        comments: 'Approved via dashboard'
      });
      loadDocuments();
      setSelectedDocument(null);
    } catch (error) {
      console.error('Error approving document:', error);
    }
  };

  const handleReject = async (docId, reason) => {
    try {
      await axios.post(`${API_URL}/api/documents/${docId}/reject`, { reason });
      loadDocuments();
      setSelectedDocument(null);
    } catch (error) {
      console.error('Error rejecting document:', error);
    }
  };

  const documentTypes = ['CTD', 'eCTD', 'SOP', 'Protocol', 'ClinicalReport', 'Manufacturing', 'Regulatory'];
  const statuses = ['Draft', 'UnderReview', 'Approved', 'Rejected', 'Archived'];

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Document Management</h2>
        
        {/* Filters */}
        <div className="flex space-x-4 mb-4">
          <select
            value={filters.document_type}
            onChange={(e) => setFilters({...filters, document_type: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Document Types</option>
            {documentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading documents...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{doc.title}</p>
                        <p className="text-sm text-gray-500">{doc.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{doc.document_type}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                        <a
                          href={`${API_URL}/api/documents/${doc.id}/download`}
                          className="text-green-600 hover:text-green-800"
                        >
                          Download
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Details Modal */}
      {selectedDocument && (
        <DocumentDetailsModal
          document={selectedDocument}
          user={user}
          onClose={() => setSelectedDocument(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

// Upload Document Component
function UploadDocument({ user }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'SOP',
    category: '',
    tags: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [documentTypes, setDocumentTypes] = useState({});

  useEffect(() => {
    loadDocumentTypes();
  }, []);

  const loadDocumentTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/config/document-types`);
      setDocumentTypes(response.data.document_types);
    } catch (error) {
      console.error('Error loading document types:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formDataToSend = new FormData();
    formDataToSend.append('file', file);
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('document_type', formData.document_type);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('tags', formData.tags);

    try {
      await axios.post(`${API_URL}/api/documents/upload`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(true);
      setFormData({
        title: '',
        description: '',
        document_type: 'SOP',
        category: '',
        tags: ''
      });
      setFile(null);
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Document</h2>
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-700">
            Document uploaded successfully!
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter document title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter document description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData({...formData, document_type: e.target.value, category: ''})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.keys(documentTypes).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {(documentTypes[formData.document_type] || []).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., quality, regulatory, validation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
              <input
                type="file"
                required
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: PDF, Word, Excel, PowerPoint, Images (Max 50MB)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Uploading...' : 'Upload Document'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Search Documents Component
function SearchDocuments({ user }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documentType, setDocumentType] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      if (documentType) params.append('document_type', documentType);
      
      const response = await axios.get(`${API_URL}/api/search?${params}`);
      setResults(response.data.results);
    } catch (error) {
      console.error('Error searching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const documentTypes = ['CTD', 'eCTD', 'SOP', 'Protocol', 'ClinicalReport', 'Manufacturing', 'Regulatory'];

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Search Documents</h2>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Search documents by title, description, or tags..."
                />
              </div>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {documentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Search Results ({results.length})</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {results.map(doc => (
                <div key={doc.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">{doc.title}</h4>
                      <p className="text-gray-600 mb-2">{doc.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Type: {doc.document_type}</span>
                        <span>Status: {doc.status}</span>
                        <span>Created: {new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="mt-2">
                          {doc.tags.map(tag => (
                            <span key={tag} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <a
                        href={`${API_URL}/api/documents/${doc.id}/download`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Workflow Management Component
function WorkflowManagement({ user }) {
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingDocuments();
  }, []);

  const loadPendingDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/documents?status=UnderReview`);
      setPendingDocuments(response.data.documents);
    } catch (error) {
      console.error('Error loading pending documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (docId, stepIndex) => {
    try {
      await axios.post(`${API_URL}/api/documents/${docId}/approve`, {
        step_index: stepIndex,
        comments: 'Approved via workflow management'
      });
      loadPendingDocuments();
    } catch (error) {
      console.error('Error approving document:', error);
    }
  };

  const handleReject = async (docId, reason) => {
    try {
      await axios.post(`${API_URL}/api/documents/${docId}/reject`, { reason });
      loadPendingDocuments();
    } catch (error) {
      console.error('Error rejecting document:', error);
    }
  };

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Workflow Management</h2>
      
      {loading ? (
        <div className="text-center py-8">Loading pending documents...</div>
      ) : (
        <div className="space-y-6">
          {pendingDocuments.map(doc => (
            <WorkflowCard
              key={doc.id}
              document={doc}
              user={user}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
          {pendingDocuments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No documents pending approval
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Audit Trail Component
function AuditTrail({ user }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role === 'Admin' || user.role === 'QualityManager') {
      loadAuditLogs();
    }
  }, [user.role]);

  const loadAuditLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/audit`);
      setAuditLogs(response.data.logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (user.role !== 'Admin' && user.role !== 'QualityManager') {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-8">
          <p className="text-red-600">Access denied. Only administrators and quality managers can view audit logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Audit Trail</h2>
      
      {loading ? (
        <div className="text-center py-8">Loading audit logs...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.user_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.action}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.resource_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full text-2xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'Draft':
      return 'bg-gray-100 text-gray-800';
    case 'UnderReview':
      return 'bg-yellow-100 text-yellow-800';
    case 'Approved':
      return 'bg-green-100 text-green-800';
    case 'Rejected':
      return 'bg-red-100 text-red-800';
    case 'Archived':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function DocumentDetailsModal({ document, user, onClose, onApprove, onReject }) {
  const [signatureData, setSignatureData] = useState({
    reason: '',
    password: ''
  });
  const [showSignature, setShowSignature] = useState(false);

  const handleSign = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/documents/${document.id}/sign`, signatureData);
      setShowSignature(false);
      setSignatureData({ reason: '', password: '' });
      onClose();
    } catch (error) {
      console.error('Error signing document:', error);
    }
  };

  const canApprove = document.approval_workflow.some(step => 
    step.status === 'Pending' && (step.assignee_role === user.role || user.role === 'Admin')
  );

  const nextStep = document.approval_workflow.findIndex(step => step.status === 'Pending');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Document Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Document Info */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">{document.title}</h4>
            <p className="text-gray-600 mb-4">{document.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Type:</span> {document.document_type}
              </div>
              <div>
                <span className="font-medium">Category:</span> {document.category}
              </div>
              <div>
                <span className="font-medium">Version:</span> {document.version}
              </div>
              <div>
                <span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(document.status)}`}>
                  {document.status}
                </span>
              </div>
            </div>
          </div>

          {/* Workflow */}
          <div>
            <h5 className="font-semibold text-gray-900 mb-3">Approval Workflow</h5>
            <div className="space-y-2">
              {document.approval_workflow.map((step, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{step.step_name}</span>
                    <span className="text-sm text-gray-500 ml-2">({step.assignee_role})</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    step.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    step.status === 'InProgress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Signatures */}
          {document.signatures && document.signatures.length > 0 && (
            <div>
              <h5 className="font-semibold text-gray-900 mb-3">Electronic Signatures</h5>
              <div className="space-y-2">
                {document.signatures.map((sig, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{sig.signer_name}</p>
                        <p className="text-sm text-gray-600">{sig.signer_role}</p>
                        <p className="text-sm text-gray-500">{sig.reason}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {new Date(sig.signed_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4 pt-4 border-t border-gray-200">
            {canApprove && nextStep !== -1 && (
              <>
                <button
                  onClick={() => onApprove(document.id, nextStep)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Approve Step
                </button>
                <button
                  onClick={() => onReject(document.id, 'Rejected via review')}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Reject
                </button>
              </>
            )}
            
            {document.status === 'Approved' && (
              <button
                onClick={() => setShowSignature(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Sign Document
              </button>
            )}
            
            <a
              href={`${API_URL}/api/documents/${document.id}/download`}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Download
            </a>
          </div>
        </div>

        {/* Signature Modal */}
        {showSignature && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Electronic Signature</h4>
              <form onSubmit={handleSign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Signing</label>
                  <input
                    type="text"
                    required
                    value={signatureData.reason}
                    onChange={(e) => setSignatureData({...signatureData, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter reason for signing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={signatureData.password}
                    onChange={(e) => setSignatureData({...signatureData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your password to confirm"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Sign Document
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSignature(false)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowCard({ document, user, onApprove, onReject }) {
  const nextStep = document.approval_workflow.findIndex(step => step.status === 'Pending');
  const canApprove = nextStep !== -1 && 
    (document.approval_workflow[nextStep].assignee_role === user.role || user.role === 'Admin');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{document.title}</h3>
          <p className="text-gray-600">{document.description}</p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span>Type: {document.document_type}</span>
            <span>Version: {document.version}</span>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
          {document.status}
        </span>
      </div>

      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Workflow Progress</h4>
        <div className="space-y-2">
          {document.approval_workflow.map((step, index) => (
            <div key={index} className={`flex items-center justify-between p-2 rounded ${
              index === nextStep ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
            }`}>
              <span className="text-sm">{step.step_name} ({step.assignee_role})</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                step.status === 'Completed' ? 'bg-green-100 text-green-800' :
                step.status === 'InProgress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {step.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {canApprove && (
        <div className="flex space-x-4">
          <button
            onClick={() => onApprove(document.id, nextStep)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
          >
            Approve Step
          </button>
          <button
            onClick={() => onReject(document.id, 'Rejected via workflow')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export default App;