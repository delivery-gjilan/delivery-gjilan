import React from 'react';

interface Props {
    checked?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
}

export const Checkbox = ({ checked = false, onChange, disabled = false }: Props) => {
    return (
        <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-900"
        />
    );
};

export default Checkbox;
