<?php include 'header.php'; ?>

<section id="contact" class="py-16">
    <div class="container mx-auto px-6">
        <h2 class="text-3xl font-bold text-center mb-8">Contact Us</h2>
        <div class="max-w-4xl mx-auto">
            <form action="send-mail.php" method="POST">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="mb-4">
                        <label for="fullName" class="block text-gray-700 font-bold mb-2">Full Name</label>
                        <input type="text" id="fullName" name="fullName" class="w-full px-3 py-2 border rounded-lg" required>
                    </div>
                    <div class="mb-4">
                        <label for="company" class="block text-gray-700 font-bold mb-2">Company (Optional)</label>
                        <input type="text" id="company" name="company" class="w-full px-3 py-2 border rounded-lg">
                    </div>
                    <div class="mb-4">
                        <label for="email" class="block text-gray-700 font-bold mb-2">Email</label>
                        <input type="email" id="email" name="email" class="w-full px-3 py-2 border rounded-lg" required>
                    </div>
                    <div class="mb-4">
                        <label for="phone" class="block text-gray-700 font-bold mb-2">Phone</label>
                        <input type="tel" id="phone" name="phone" class="w-full px-3 py-2 border rounded-lg" required>
                    </div>
                    <div class="mb-4">
                        <label for="city" class="block text-gray-700 font-bold mb-2">City</label>
                        <input type="text" id="city" name="city" class="w-full px-3 py-2 border rounded-lg" required>
                    </div>
                    <div class="mb-4">
                        <label for="projectType" class="block text-gray-700 font-bold mb-2">Project Type</label>
                        <input type="text" id="projectType" name="projectType" class="w-full px-3 py-2 border rounded-lg" required>
                    </div>
                    <div class="mb-4 md:col-span-2">
                        <label for="projectArea" class="block text-gray-700 font-bold mb-2">Project Area (in sq. ft.)</label>
                        <input type="text" id="projectArea" name="projectArea" class="w-full px-3 py-2 border rounded-lg" required>
                    </div>
                    <div class="mb-4 md:col-span-2">
                        <label for="projectBrief" class="block text-gray-700 font-bold mb-2">Project Brief</label>
                        <textarea id="projectBrief" name="projectBrief" rows="5" class="w-full px-3 py-2 border rounded-lg" required></textarea>
                    </div>
                </div>
                <div class="text-center mt-6">
                    <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
                        Send Message
                    </button>
                </div>
            </form>
        </div>
    </div>
</section>

<?php include 'footer.php'; ?>