export default function DataDeletionPage() {
  return (
    <div className="h-full overflow-y-auto bg-background px-6 pb-[112px] pt-[88px]">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 text-text-primary">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-primary">Sple</p>
          <h1 className="text-2xl font-bold">사용자 데이터 삭제 안내</h1>
          <p className="text-sm leading-6 text-text-secondary">
            시행일: 2026년 5월 15일
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">삭제할 수 있는 데이터</h2>
          <p className="text-sm leading-7">
            Sple 사용자는 서비스 이용 중 저장된 개인정보와 장소 데이터를 삭제
            요청할 수 있습니다. 삭제 대상에는 Google 로그인 계정 식별 정보,
            저장된 장소 목록, 사용자가 붙여넣은 텍스트의 분석 기록, Instagram DM
            공유로 생성된 임시 저장 링크와 식별 정보가 포함될 수 있습니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">삭제 요청 방법</h2>
          <p className="text-sm leading-7">
            아래 이메일로 데이터 삭제 요청을 보내주세요. 요청을 확인하기 위해
            Sple에 로그인한 이메일 주소를 함께 알려주시면 처리에 도움이 됩니다.
          </p>
          <a
            className="text-sm font-semibold text-primary underline underline-offset-4"
            href="mailto:rladydgml82@gmail.com?subject=Sple%20데이터%20삭제%20요청"
          >
            rladydgml82@gmail.com
          </a>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">처리 기간</h2>
          <p className="text-sm leading-7">
            삭제 요청은 접수 후 합리적인 기간 내에 처리합니다. 법령상 보관이
            필요한 정보나 보안, 부정 이용 방지를 위해 일시적으로 필요한 기록은
            관련 법령과 내부 기준에 따라 제한적으로 보관될 수 있습니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Google 계정 연결 해제</h2>
          <p className="text-sm leading-7">
            Google 계정의 보안 또는 앱 연결 설정에서 Sple의 접근 권한을 제거할
            수 있습니다. 연결 해제 후에도 Sple에 이미 저장된 데이터 삭제를
            원하면 위 이메일로 별도 요청해 주세요.
          </p>
        </section>
      </article>
    </div>
  );
}
