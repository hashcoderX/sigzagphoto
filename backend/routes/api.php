<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PhotoController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\BookingController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\JobCardController;
use App\Http\Controllers\Admin\ReminderController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\AccountingEntryController;
use App\Http\Controllers\Admin\UsersController;
use App\Http\Controllers\Admin\SuperAdminController;
use App\Http\Controllers\Admin\JobCardExpenseController;
use App\Http\Controllers\Admin\ItemController;
use App\Http\Controllers\Admin\PackageController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\ForumThreadController;
use App\Http\Controllers\ForumPostController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Contact form endpoint (public)
Route::post('/contact', [ContactController::class, 'store']);
// Newsletter subscribe (public)
Route::post('/subscribe', [SubscriptionController::class, 'store']);

// Auth endpoints (token-based)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
// OAuth sign-in with Google (frontend sends ID token)
Route::post('/oauth/google', [AuthController::class, 'loginWithGoogle']);
// Forum public endpoints
Route::get('/forum/threads', [ForumThreadController::class, 'index']);
Route::get('/forum/threads/{thread}', [ForumThreadController::class, 'show']);
// OAuth sign-in with Facebook (frontend sends access token)
Route::post('/oauth/facebook', [AuthController::class, 'loginWithFacebook']);
Route::middleware('auth:sanctum')->group(function () {
        // Forum write endpoints
    Route::post('/forum/threads', [ForumThreadController::class, 'store']);
    Route::patch('/forum/threads/{thread}', [ForumThreadController::class, 'update']);
    Route::delete('/forum/threads/{thread}', [ForumThreadController::class, 'destroy']);

    Route::post('/forum/threads/{thread}/posts', [ForumPostController::class, 'store']);
    Route::patch('/forum/posts/{post}', [ForumPostController::class, 'update']);
    Route::delete('/forum/posts/{post}', [ForumPostController::class, 'destroy']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::match(['put','patch'], '/me', [AuthController::class, 'update']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/dashboard-summary', [DashboardController::class, 'summary']);
    Route::post('/photos', [PhotoController::class, 'store']);
    Route::get('/my/photos', [PhotoController::class, 'my']);
    Route::post('/checkout', [PhotoController::class, 'checkout']);
    // Subscription/Trial endpoints removed

    // Admin CRUD routes (no subscription gating)
    Route::prefix('admin')->group(function () {
        Route::apiResource('customers', CustomerController::class);
        Route::apiResource('items', ItemController::class);
        Route::apiResource('packages', PackageController::class);
        Route::get('bookings/calendar', [BookingController::class, 'calendar']);
        Route::get('bookings/next', [BookingController::class, 'nextBooking']);
        Route::apiResource('bookings', BookingController::class);
        // Booking confirmation PDF
        Route::post('bookings/{booking}/confirmation-report', [BookingController::class, 'confirmationReport']);
        // Booking reminders
        Route::post('bookings/{booking}/send-reminder', [BookingController::class, 'sendReminder']);
        // Summary & timeseries must come before resource routes to avoid wildcard capture
        Route::get('payments/summary', [PaymentController::class, 'summary']);
        Route::get('payments/timeseries', [PaymentController::class, 'timeseries']);
        Route::get('payments/{payment}/pdf', [PaymentController::class, 'pdf']);
        Route::apiResource('payments', PaymentController::class);
        Route::apiResource('job-cards', JobCardController::class);
        Route::post('job-cards/{job_card}/invoice', [JobCardController::class, 'createInvoice']);
        Route::post('job-cards/{job_card}/transport-invoice', [JobCardController::class, 'createTransportInvoice']);
        Route::get('job-cards/{job_card}/payments', [JobCardController::class, 'getPayments']);
        // Task management routes
        Route::post('job-cards/{job_card}/tasks', [JobCardController::class, 'createTask']);
        Route::patch('job-cards/{job_card}/tasks/{task}', [JobCardController::class, 'updateTask']);
        Route::delete('job-cards/{job_card}/tasks/{task}', [JobCardController::class, 'deleteTask']);
        Route::patch('job-cards/{job_card}/tasks/{task}/toggle', [JobCardController::class, 'toggleTask']);
        Route::apiResource('reminders', ReminderController::class);
        Route::get('reminders/sent-today', [ReminderController::class, 'sentToday']);
        Route::apiResource('invoices', InvoiceController::class);
        Route::apiResource('invoice-templates', \App\Http\Controllers\Admin\InvoiceTemplateController::class);
        Route::get('invoice-templates/{invoiceTemplate}/preview-data', [\App\Http\Controllers\Admin\InvoiceTemplateController::class, 'getPreviewData']);
        Route::apiResource('footer-rules', \App\Http\Controllers\Admin\FooterRuleController::class);
        // Specific report route should come BEFORE resource to avoid wildcard capture
        Route::get('accounting/balance-report', [AccountingEntryController::class, 'balanceReport']);
        Route::apiResource('accounting', AccountingEntryController::class);
        // Place specific routes BEFORE resource to avoid wildcard capture
        Route::get('job-card-expenses/job-cards/{jobCard}/summary', [JobCardExpenseController::class, 'getJobCardSummary']);
        Route::get('job-card-expenses/event-types', [JobCardExpenseController::class, 'getEventTypes']);
        Route::apiResource('job-card-expenses', JobCardExpenseController::class);
        // Users & Privileges management
        Route::get('users', [UsersController::class, 'index']);
        Route::post('users', [UsersController::class, 'store']);
        Route::match(['put','patch'], 'users/{user}', [UsersController::class, 'update']);

        // Super admin endpoints
        Route::get('super/users', [SuperAdminController::class, 'users']);
        Route::patch('super/users/{user}/active', [SuperAdminController::class, 'setActive']);
        Route::patch('super/users/{user}/premium', [SuperAdminController::class, 'setPremium']);
        Route::get('super/income/summary', [SuperAdminController::class, 'incomeSummary']);
    });
});

// Public download for free photos
Route::get('/photos', [PhotoController::class, 'index']);
Route::get('/photos/{photo}', [PhotoController::class, 'show']);
Route::get('/photos/{photo}/download', [PhotoController::class, 'download'])->name('photos.download');
Route::post('/photos/{photo}/like', [PhotoController::class, 'like']);
Route::post('/photos/{photo}/enhance', [PhotoController::class, 'enhance'])->name('photos.enhance');
