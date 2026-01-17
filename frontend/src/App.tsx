import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './app/layout';
import HomePage from './app/page';

// Lazy load pages
const AskPage = React.lazy(() => import('./app/ask/page'));
const BuyPage = React.lazy(() => import('./app/buy/page'));
const ConfirmPage = React.lazy(() => import('./app/confirm/page'));
const LoginPage = React.lazy(() => import('./app/login/page'));
// const OwnerPage = React.lazy(() => import('./app/owner/page')); // Removed as it doesn't exist
const OwnerLoginPage = React.lazy(() => import('./app/owner-login/page'));
const PaymentPage = React.lazy(() => import('./app/payment/page'));
const ProductsPage = React.lazy(() => import('./app/products/page'));
const SignagePage = React.lazy(() => import('./app/signage/page'));
const SignupPage = React.lazy(() => import('./app/signup/page'));
const StartPage = React.lazy(() => import('./app/start/page'));
const OwnerDashboardPage = React.lazy(() => import('./app/owner/dashboard/page'));
const OwnerIngredientsPage = React.lazy(() => import('./app/owner/ingredients/page'));
const OwnerSalesPage = React.lazy(() => import('./app/owner/sales-details/page'));

function App() {
    return (
        <Router>
            <Layout>
                <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/ask" element={<AskPage />} />
                        <Route path="/buy" element={<BuyPage />} />
                        <Route path="/confirm" element={<ConfirmPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/owner" element={<OwnerPage />} />
                        <Route path="/owner-login" element={<OwnerLoginPage />} />
                        <Route path="/payment" element={<PaymentPage />} />
                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/signage" element={<SignagePage />} />
                        <Route path="/signup" element={<SignupPage />} />
                        <Route path="/start" element={<StartPage />} />
                        <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
                        <Route path="/owner/ingredients" element={<OwnerIngredientsPage />} />
                        <Route path="/owner/sales-details" element={<OwnerSalesPage />} />
                    </Routes>
                </Suspense>
            </Layout>
        </Router>
    );
}

export default App;
