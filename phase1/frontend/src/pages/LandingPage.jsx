import React, { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const LandingPage = () => {
    const navigate = useNavigate()
    const videoRef = useRef(null)

    const handleClick = () => {
        navigate('/bottles')
    }

    useEffect(() => {
        // Attempt to ensure autoplay works
        if (videoRef.current) {
            videoRef.current.play().catch(error => {
                console.log("Autoplay prevented:", error)
            })
        }
    }, [])

    return (
        <div className="landing-container" onClick={handleClick}>
            <div className="video-background">
                <video
                    ref={videoRef}
                    src="/idle.mp4"
                    autoPlay
                    loop
                    playsInline
                    className="fullscreen-video"
                />
                <div className="overlay-text">
                    <h1>Touch Screen to Start</h1>
                </div>
            </div>
        </div>
    )
}

export default LandingPage
