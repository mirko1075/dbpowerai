import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AppPage from './pages/AppPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Pricing from './pages/Pricing';
import Signup from './pages/Signup';
import Success from './pages/Success';
import Contact from './pages/Contact';
import Navbar from './components/Navbar';
import Footer from "./components/Footer.tsx";

type TabType = 'before' | 'after' | 'indexes' | 'explanation' | 'advanced';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('before');
  const [isAnimating, setIsAnimating] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    database: '',
    painPoint: '',
    query: ''
  });
  const [errors, setErrors] = useState({
    email: '',
    database: '',
    painPoint: ''
  });

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsAnimating(false);
    }, 150);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    const invalidPatterns = [
      /test@test\./i,
      /aaa@aaa\./i,
      /abc@abc\./i,
      /example@example\./i,
      /demo@demo\./i,
      /fake@fake\./i,
      /asdf@asdf\./i,
      /qwer@qwer\./i
    ];

    return !invalidPatterns.some(pattern => pattern.test(email));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'email' && value) {
      setErrors(prev => ({ ...prev, email: '' }));
    } else if (field === 'database' && value) {
      setErrors(prev => ({ ...prev, database: '' }));
    } else if (field === 'painPoint' && value) {
      setErrors(prev => ({ ...prev, painPoint: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let hasErrors = false;
    const newErrors = { email: '', database: '', painPoint: '' };

    if (!formData.email) {
      newErrors.email = 'Work email is required';
      hasErrors = true;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid work email';
      hasErrors = true;
    }

    if (!formData.database) {
      newErrors.database = 'Please select your database';
      hasErrors = true;
    }

    if (!formData.painPoint) {
      newErrors.painPoint = 'Please select an option';
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    const form = e.target as HTMLFormElement;
    form.submit();
  };

  return (
    <div className="App">
      <Navbar />
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/success" element={<Success />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </Router>
      <Footer />
    </div>
  );
}

export default App;