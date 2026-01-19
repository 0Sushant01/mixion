import { useNavigate } from 'react-router-dom'
import React, { useState, useEffect } from 'react'
import axios from 'axios'


const BottlePage = () => {
    const [bottles, setBottles] = useState([])
    const [quantities, setQuantities] = useState({})
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        let timeoutId;
        const timeoutDuration = 90000; // 90 seconds

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                navigate('/');
            }, timeoutDuration);
        };

        const events = ['mousemove', 'mousedown', 'touchstart', 'keypress', 'click', 'scroll'];

        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        resetTimer();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [navigate]);

    const fetchBottles = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/bottles/')
            setBottles(response.data)
            setLoading(false)
        } catch (error) {
            console.error('Error fetching bottles:', error)
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBottles()
    }, [])

    const handleQuantityChange = (bottleId, value) => {
        setQuantities(prev => ({
            ...prev,
            [bottleId]: value
        }))
    }

    const handleMix = async () => {
        const selected = Object.entries(quantities)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => ({ id, quantity: qty }))

        if (selected.length === 0) {
            alert("Please select at least one drink!")
            return
        }

        console.log('Mixing:', selected)
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/esp32/mix/', selected)
            console.log("Mix response:", response.data)
            alert("Mixing started! Enjoy!")
            setQuantities({}) // Reset selection
        } catch (error) {
            console.error("Error starting mix:", error)
            alert("Failed to start mixing. Check console.")
        }
    }

    return (
        <div className="bottle-page">
            <h1>Select Your Mix</h1>

            {loading ? <p>Loading...</p> : (
                <div className="bottle-grid">
                    {bottles.map(bottle => (
                        <div key={bottle.id} className="bottle-card">
                            <h3>{bottle.bottle_type || 'Unknown Type'}</h3>
                            <p>{bottle.ingredient || 'Unknown Ingredient'}</p>
                            <div className="quantity-control">
                                <label>Quantity (ml):</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={quantities[bottle.id] || 0}
                                    onChange={(e) => handleQuantityChange(bottle.id, parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="actions">
                <button onClick={handleMix} className="mix-button">Mix It!</button>
            </div>
        </div>
    )
}

export default BottlePage
