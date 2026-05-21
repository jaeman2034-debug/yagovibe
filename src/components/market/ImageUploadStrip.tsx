import { useRef } from "react";

interface ImageUploadStripProps {
	onSelect: (files: File[], previews: string[]) => void;
	previews: string[];
	disabled?: boolean;
}

export default function ImageUploadStrip({ onSelect, previews, disabled }: ImageUploadStripProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length === 0) return;
		const urls = files.map((f) => URL.createObjectURL(f));
		onSelect(files, urls);
		// input value reset to allow re-selecting same file
		e.currentTarget.value = "";
	};

	return (
		<div className="w-full">
			<div className="flex gap-2 overflow-x-auto pb-2">
				{[0,1,2].map((slot) => (
					<label
						key={`slot-${slot}`}
						className="w-20 h-20 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 cursor-pointer flex-shrink-0 hover:bg-gray-50"
					>
						<span className="text-xl">+</span>
						<input
							ref={slot === 0 ? inputRef : undefined}
							type="file"
							accept="image/*"
							multiple
							hidden
							disabled={disabled}
							onChange={handleChange}
						/>
					</label>
				))}
				{previews.map((src, idx) => (
					<div key={idx} className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 relative">
						{idx === 0 && (
							<span className="absolute top-1 left-1 text-[10px] leading-none bg-black/70 text-white px-1.5 py-0.5 rounded">
								대표
							</span>
						)}
						<img src={src} alt={`preview-${idx}`} className="w-full h-full object-cover" />
					</div>
				))}
			</div>
		</div>
	);
}

