<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccountingEntry;
use App\Models\Payment;
use App\Models\JobCardExpense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\DB;
use Dompdf\Dompdf;
use Dompdf\Options;
use Carbon\Carbon;

class AccountingEntryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $expenseType = $request->query('expense_type', 'general'); // 'general' or 'job_card'

        if ($expenseType === 'job_card') {
            // Handle job card expenses
            return app(JobCardExpenseController::class)->index($request);
        }

        // Handle general accounting entries
        $query = AccountingEntry::where('user_id', $user->id)
            ->orderByDesc('date');

        if ($search = $request->query('q')) {
            $query->where(function ($q2) use ($search) {
                $q2->where('type', 'like', "%$search%")
                   ->orWhere('category', 'like', "%$search%")
                   ->orWhere('notes', 'like', "%$search%");
            });
        }

        return $query->paginate((int) $request->query('per_page', 10));
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'type' => ['required','string','in:income,expense'],
            'amount' => ['required','numeric','min:0'],
            'category' => ['nullable','string','max:255'],
            'date' => ['required','date'],
            'notes' => ['nullable','string'],
        ]);
        $data['user_id'] = $user->id;
        $entry = AccountingEntry::create($data);
        return response()->json($entry, 201);
    }

    public function show(Request $request, AccountingEntry $accounting_entry)
    {
        $this->authorizeAccess($request, $accounting_entry);
        return $accounting_entry;
    }

    public function update(Request $request, AccountingEntry $accounting_entry)
    {
        $this->authorizeAccess($request, $accounting_entry);
        $data = $request->validate([
            'type' => ['sometimes','string','in:income,expense'],
            'amount' => ['sometimes','numeric','min:0'],
            'category' => ['nullable','string','max:255'],
            'date' => ['sometimes','date'],
            'notes' => ['nullable','string'],
        ]);
        $accounting_entry->update($data);
        return $accounting_entry;
    }

    public function destroy(Request $request, AccountingEntry $accounting_entry)
    {
        $this->authorizeAccess($request, $accounting_entry);
        $accounting_entry->delete();
        return response()->json(['status' => 'deleted']);
    }

    private function authorizeAccess(Request $request, AccountingEntry $entry): void
    {
        abort_if($entry->user_id !== $request->user()->id, 403);
    }

    /**
     * Generate a Balance Sheet PDF including incomes (payments + income entries)
     * and expenses (general expense entries + job card expenses) for an optional date range.
     */
    public function balanceReport(Request $request)
    {
        $user = $request->user();
        $start = $request->query('start_date');
        $end = $request->query('end_date');

        $startDate = $start ? Carbon::parse($start)->startOfDay() : null;
        $endDate = $end ? Carbon::parse($end)->endOfDay() : null;

        // Payments as incomes
        $paymentsQ = Payment::query()
            ->with(['customer'])
            ->where('user_id', $user->id)
            ->where('status', 'paid');
        if ($startDate) { $paymentsQ->whereDate(DB::raw('COALESCE(paid_at, created_at)'), '>=', $startDate->toDateString()); }
        if ($endDate) { $paymentsQ->whereDate(DB::raw('COALESCE(paid_at, created_at)'), '<=', $endDate->toDateString()); }
        $payments = $paymentsQ->orderBy('id', 'asc')->get();

        // General accounting entries
        $entriesQ = AccountingEntry::query()
            ->where('user_id', $user->id);
        if ($startDate) { $entriesQ->whereDate('date', '>=', $startDate->toDateString()); }
        if ($endDate) { $entriesQ->whereDate('date', '<=', $endDate->toDateString()); }
        $entries = $entriesQ->orderBy('date', 'asc')->get();

        // Job card expenses
        $jcQ = JobCardExpense::query()
            ->with(['jobCard'])
            ->where('user_id', $user->id);
        if ($startDate) { $jcQ->whereDate('expense_date', '>=', $startDate->toDateString()); }
        if ($endDate) { $jcQ->whereDate('expense_date', '<=', $endDate->toDateString()); }
        $jobCardExpenses = $jcQ->orderBy('expense_date', 'asc')->get();

        // Totals
        $incomeFromPayments = (float) $payments->sum('amount');
        $incomeFromEntries = (float) $entries->where('type', 'income')->sum('amount');
        $expenseFromEntries = (float) $entries->where('type', 'expense')->sum('amount');
        $expenseFromJobCards = (float) $jobCardExpenses->sum('amount');
        $totalIncome = $incomeFromPayments + $incomeFromEntries;
        $totalExpense = $expenseFromEntries + $expenseFromJobCards;
        $net = $totalIncome - $totalExpense;

        // Render blade
        $html = View::make('pdf.balance', [
            'brand' => $user,
            'payments' => $payments,
            'entries' => $entries,
            'jobCardExpenses' => $jobCardExpenses,
            'totalIncome' => $totalIncome,
            'totalExpense' => $totalExpense,
            'net' => $net,
            'startDate' => $startDate,
            'endDate' => $endDate,
        ])->render();

        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        $filename = 'balance_sheet_'.now()->format('Ymd_His').'.pdf';
        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }
}
