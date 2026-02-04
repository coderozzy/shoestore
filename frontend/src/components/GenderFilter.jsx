import './GenderFilter.css';

export default function GenderFilter({ selected, onChange }) {
    const filters = [
        { value: 'ALL', label: 'All', icon: '👟' },
        { value: 'MALE', label: 'Men', icon: '👞' },
        { value: 'FEMALE', label: 'Women', icon: '👠' },
    ];

    return (
        <div className="gender-filter">
            {filters.map((filter) => (
                <button
                    key={filter.value}
                    className={`filter-btn ${selected === filter.value ? 'active' : ''}`}
                    onClick={() => onChange(filter.value)}
                >
                    <span className="filter-icon">{filter.icon}</span>
                    <span className="filter-label">{filter.label}</span>
                </button>
            ))}
        </div>
    );
}
