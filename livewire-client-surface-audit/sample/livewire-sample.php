<?php

namespace App\Livewire\Billing;

use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\WithFileUploads;
use App\Models\Invoice;

class InvoiceEditor extends Component
{
    use WithFileUploads;

    public $invoiceId;
    public int $amountDue = 0;
    public string $status = 'draft';
    public $apiToken;
    public $receipt;

    #[Url]
    public $customerId;

    public function mount($invoiceId)
    {
        $this->invoiceId = $invoiceId;
        $this->amountDue = Invoice::findOrFail($invoiceId)->amount_due;
    }

    public function approve()
    {
        Invoice::find($this->invoiceId)->update($this->only(['amountDue', 'status']));
    }

    public function deleteInvoice()
    {
        Invoice::find($this->invoiceId)->delete();
    }

    public function saveReceipt()
    {
        $path = $this->receipt->store('receipts');
        Invoice::find($this->invoiceId)->receipt_path = $path;
    }

    public function render()
    {
        dump($this->apiToken);

        return <<<'blade'
            <div class="invoice">
                {!! $invoiceNotes !!}
                @include($layoutName)
                <input type="number" wire:model.live="amountDue">
                <button wire:click="approve">Approve</button>
            </div>
        blade;
    }
}
