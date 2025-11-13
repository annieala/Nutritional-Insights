import React, { useState, useEffect } from 'react';
import { LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, PieChart, Pie, Cell } from 'recharts';

export default function NutritionalInsights() {
  // State management using useState
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [dietTypesData, setDietTypesData] = useState([]);
  const [rawCSVData, setRawCSVData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [apiResults, setApiResults] = useState({ visible: false, title: '', content: '' });
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Filter state
  const [filters, setFilters] = useState({
    dietType: 'all',
    nutrient: 'all',
    sort: 'name',
    proteinMax: 200,
    carbsMax: 300,
    fatMax: 200
  });

  const itemsPerPage = 3;
  const COLORS = ['#3B82F6', '#10B981', '#FB923C', '#8B5CF6', '#EC4899'];

  // Load CSV data on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadCSVData();
    }
  }, [isAuthenticated]);

  // Update filtered data when filters or diet types change
  useEffect(() => {
    if (dietTypesData.length > 0) {
      const filtered = filterAndSortData(dietTypesData, filters);
      setFilteredData(filtered);
      setCurrentPage(1);
    }
  }, [filters, dietTypesData]);

  // Mock authentication
  const handleLogin = (email, password) => {
    setIsAuthenticated(true);
    setUserData({ email, name: 'User', role: 'user' });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserData(null);
  };

  // Load CSV data
  const loadCSVData = async () => {
    setIsLoading(true);
    try {
      // Simulated CSV data
      const mockData = [
        { Diet_type: 'Vegan', 'Protein(g)': 25, 'Carbs(g)': 120, 'Fat(g)': 15, Recipe_name: 'Vegan Buddha Bowl' },
        { Diet_type: 'Keto', 'Protein(g)': 35, 'Carbs(g)': 20, 'Fat(g)': 65, Recipe_name: 'Keto Salmon' },
        { Diet_type: 'Paleo', 'Protein(g)': 40, 'Carbs(g)': 80, 'Fat(g)': 30, Recipe_name: 'Paleo Chicken' },
        { Diet_type: 'Mediterranean', 'Protein(g)': 28, 'Carbs(g)': 100, 'Fat(g)': 25, Recipe_name: 'Greek Salad' },
        { Diet_type: 'Dash', 'Protein(g)': 30, 'Carbs(g)': 110, 'Fat(g)': 20, Recipe_name: 'Heart Healthy Bowl' },
      ];
      
      setRawCSVData(mockData);
      const processed = processCSVData(mockData);
      setDietTypesData(processed);
      setFilteredData(processed);
    } catch (error) {
      console.error('Error loading CSV:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processCSVData = (data) => {
    const dietGroups = {};
    data.forEach(row => {
      const dietType = row.Diet_type;
      if (!dietGroups[dietType]) {
        dietGroups[dietType] = { proteinSum: 0, carbsSum: 0, fatSum: 0, count: 0 };
      }
      dietGroups[dietType].proteinSum += row['Protein(g)'] || 0;
      dietGroups[dietType].carbsSum += row['Carbs(g)'] || 0;
      dietGroups[dietType].fatSum += row['Fat(g)'] || 0;
      dietGroups[dietType].count++;
    });
    
    return Object.keys(dietGroups).map(dietType => {
      const group = dietGroups[dietType];
      return {
        Diet_type: dietType,
        Protein: group.proteinSum / group.count,
        Carbs: group.carbsSum / group.count,
        Fat: group.fatSum / group.count,
        recipes: group.count
      };
    });
  };

  const filterAndSortData = (data, currentFilters) => {
    let filtered = data.filter(item => {
      const matchesDiet = currentFilters.dietType === 'all' || 
                         item.Diet_type.toLowerCase() === currentFilters.dietType;
      const matchesProtein = item.Protein <= currentFilters.proteinMax;
      const matchesCarbs = item.Carbs <= currentFilters.carbsMax;
      const matchesFat = item.Fat <= currentFilters.fatMax;
      return matchesDiet && matchesProtein && matchesCarbs && matchesFat;
    });

    // Sort
    switch(currentFilters.sort) {
      case 'name':
        return filtered.sort((a, b) => a.Diet_type.localeCompare(b.Diet_type));
      case 'protein-high':
        return filtered.sort((a, b) => b.Protein - a.Protein);
      case 'protein-low':
        return filtered.sort((a, b) => a.Protein - b.Protein);
      case 'carbs-high':
        return filtered.sort((a, b) => b.Carbs - a.Carbs);
      case 'carbs-low':
        return filtered.sort((a, b) => a.Carbs - b.Carbs);
      case 'fat-high':
        return filtered.sort((a, b) => b.Fat - a.Fat);
      case 'fat-low':
        return filtered.sort((a, b) => a.Fat - b.Fat);
      default:
        return filtered;
    }
  };

  const applyFilters = () => {
    const filtered = filterAndSortData(dietTypesData, filters);
    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      dietType: 'all',
      nutrient: 'all',
      sort: 'name',
      proteinMax: 200,
      carbsMax: 300,
      fatMax: 200
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // API functions
  const getNutritionalInsights = () => {
    const totalRecipes = filteredData.reduce((sum, item) => sum + item.recipes, 0);
    const avgProtein = filteredData.reduce((sum, item) => sum + item.Protein, 0) / filteredData.length;
    const avgCarbs = filteredData.reduce((sum, item) => sum + item.Carbs, 0) / filteredData.length;
    const avgFat = filteredData.reduce((sum, item) => sum + item.Fat, 0) / filteredData.length;
    
    setApiResults({
      visible: true,
      title: '📊 Nutritional Insights',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800">Total Diet Types</h4>
              <p className="text-2xl font-bold text-blue-600">{filteredData.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800">Total Recipes</h4>
              <p className="text-2xl font-bold text-green-600">{totalRecipes}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800">Avg Protein</h4>
              <p className="text-2xl font-bold text-purple-600">{avgProtein.toFixed(1)}g</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-semibold text-orange-800">Avg Carbs</h4>
              <p className="text-2xl font-bold text-orange-600">{avgCarbs.toFixed(1)}g</p>
            </div>
          </div>
        </div>
      )
    });
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Nutritional Insights</h1>
            <p className="text-gray-600">Secure Cloud-Native Application</p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleLogin('user@example.com', 'password'); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Data...</h2>
          <p className="text-gray-600">Processing nutritional information</p>
        </div>
      </div>
    );
  }

  // Main Application
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 p-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold">Nutritional Insights</h1>
            <p className="text-sm mt-1">Secure Cloud-Native Application</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{userData?.name}</p>
            <p className="text-sm">{userData?.email}</p>
            <button 
              onClick={handleLogout}
              className="mt-2 text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {/* Security Dashboard */}
        <section className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-3">Security Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-green-700">Authenticated</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-green-700">Session Active</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 ${is2FAEnabled ? 'bg-green-500' : 'bg-yellow-500'} rounded-full mr-2`}></div>
              <span className={is2FAEnabled ? 'text-green-700' : 'text-yellow-700'}>
                2FA: {is2FAEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIs2FAEnabled(!is2FAEnabled)}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
          >
            {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </section>

        {/* Charts */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Nutritional Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold mb-2">Macronutrients by Diet</h3>
              <BarChart width={400} height={300} data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Diet_type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Protein" fill="#3B82F6" />
                <Bar dataKey="Carbs" fill="#10B981" />
                <Bar dataKey="Fat" fill="#FB923C" />
              </BarChart>
            </div>

            {/* Pie Chart */}
            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold mb-2">Recipe Distribution</h3>
              <PieChart width={400} height={300}>
                <Pie
                  data={filteredData}
                  dataKey="recipes"
                  nameKey="Diet_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Advanced Filters</h2>
          <div className="bg-white p-6 shadow-lg rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Diet Type</label>
                <select 
                  value={filters.dietType}
                  onChange={(e) => handleFilterChange('dietType', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Diet Types</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto</option>
                  <option value="paleo">Paleo</option>
                  <option value="mediterranean">Mediterranean</option>
                  <option value="dash">Dash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Protein Max: {filters.proteinMax}g
                </label>
                <input 
                  type="range"
                  min="0"
                  max="200"
                  value={filters.proteinMax}
                  onChange={(e) => handleFilterChange('proteinMax', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
                <select 
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Diet Name (A-Z)</option>
                  <option value="protein-high">Highest Protein</option>
                  <option value="protein-low">Lowest Protein</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={applyFilters}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Apply Filters
              </button>
              <button 
                onClick={resetFilters}
                className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500"
              >
                Reset All
              </button>
            </div>
          </div>
        </section>

        {/* API Interactions */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Insights</h2>
          <button 
            onClick={getNutritionalInsights}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Get Nutritional Insights
          </button>

          {apiResults.visible && (
            <div className="mt-4 bg-white p-6 rounded-lg shadow-lg border-2 border-blue-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{apiResults.title}</h3>
                <button 
                  onClick={() => setApiResults({ ...apiResults, visible: false })}
                  className="text-gray-500 hover:text-gray-700 font-bold text-xl"
                >
                  ×
                </button>
              </div>
              {apiResults.content}
            </div>
          )}
        </section>

        {/* Data Table */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Table</h2>
          <div className="bg-white p-4 shadow-lg rounded-lg overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left">Diet Type</th>
                  <th className="px-4 py-2 text-left">Protein (g)</th>
                  <th className="px-4 py-2 text-left">Carbs (g)</th>
                  <th className="px-4 py-2 text-left">Fat (g)</th>
                  <th className="px-4 py-2 text-left">Recipes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{item.Diet_type}</td>
                    <td className="px-4 py-2">{item.Protein.toFixed(2)}</td>
                    <td className="px-4 py-2">{item.Carbs.toFixed(2)}</td>
                    <td className="px-4 py-2">{item.Fat.toFixed(2)}</td>
                    <td className="px-4 py-2">{item.recipes}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded ${currentPage === 1 ? 'bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded ${currentPage === totalPages ? 'bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-blue-600 p-4 text-white text-center">
        <p>&copy; 2025 Nutritional Insights. All Rights Reserved.</p>
        <p className="mt-2 font-semibold">Group 7</p>
      </footer>
    </div>
  );
}
