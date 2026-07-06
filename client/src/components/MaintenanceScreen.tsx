import { Settings } from 'lucide-react';
import './MaintenanceScreen.css';

interface MaintenanceScreenProps {
    onLoginClick: () => void;
}

export const MaintenanceScreen = ({ onLoginClick }: MaintenanceScreenProps) => {
    return (
        <div className="maintenance-screen">
            <div className="maintenance-content">
                <div className="maintenance-icon">
                    <Settings size={80} className="spin-slow" />
                </div>
                <h1>Сайт на технічному обслуговуванні</h1>
                <p>
                    Ми зараз проводимо важливі оновлення, щоб зробити ваш досвід покупок ще кращим.
                    Сайт буде недоступним протягом короткого часу.<br /><br />
                    Дякуємо за розуміння!
                </p>
                <div className="maintenance-footer">
                    <button onClick={onLoginClick} className="admin-login-link">
                        🔑 Якщо ви адміністратор - увійти
                    </button>
                </div>
            </div>
        </div>
    );
};
