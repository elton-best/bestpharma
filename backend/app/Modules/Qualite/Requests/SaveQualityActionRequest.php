<?php

declare(strict_types=1);
namespace App\Modules\Qualite\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveQualityActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array('qualite.write', $this->attributes->get('officine.permissions', []), true);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:180', 'regex:/\S/u'],
            'chapter' => ['required', 'string', 'max:120', 'regex:/\S/u'],
            'severity' => ['required', Rule::in(['low', 'medium', 'high'])],
            'owner' => ['required', 'string', 'max:120', 'regex:/\S/u'],
            'due_date' => ['required', 'date_format:Y-m-d'],
            'status' => ['required', Rule::in(['open', 'in_progress', 'closed'])],
            'description' => ['required', 'string', 'max:5000', 'regex:/\S/u'],
            'resolution' => ['nullable', 'required_if:status,closed', 'string', 'max:5000', 'regex:/\S/u'],
            'officine_id' => ['prohibited'],
            'created_by' => ['prohibited'],
        ];
    }
}
