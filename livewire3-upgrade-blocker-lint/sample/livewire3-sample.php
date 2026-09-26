<?php

namespace App\Http\Livewire;

use Livewire\Component;

class InvoiceRows extends Component
{
    public string $search = '';

    protected $queryString = ['search'];

    public function save(): void
    {
        $this->emit('invoiceSaved', $this->search);
        $this->emitTo('billing.totals', 'refresh');
        $this->emitUp('rowChanged');
        $this->dispatchBrowserEvent('notify', ['body' => 'Saved']);
    }

    public function render()
    {
        return <<<'HTML'
        <div>
            @livewireStyles
            <input type="search" wire:model.defer="search">
            <input type="text" wire:model.lazy="note">
            <input type="text" wire:model.debounce.400ms="filter">
            <button wire:click.prefetch="save">Save</button>

            @foreach ($this->rows as $row)
                <livewire:invoice-row :row="$row" />
            @endforeach

            <script>
                document.addEventListener('livewire:load', function () {
                    Alpine.data('panel', () => ({ open: $wire.entangle('open').defer }));
                });
            </script>
        </div>
        HTML;
    }
}
